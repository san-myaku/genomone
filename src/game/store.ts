import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Genome, breed, computeRarity, randomGenome, phenotypeTraitKeys, TIER_ORDER } from '../genetics/genome';
import { randomName } from '../genetics/names';
import { Genomon, Egg, Inventory, Stage, Stats } from './types';

const DAY_MS = 180_000; // 3分でゲーム内1日
const STAGE_DAYS: { stage: Stage; until: number }[] = [
  { stage: 'baby', until: 1 },
  { stage: 'child', until: 3 },
  { stage: 'adult', until: 12 },
  { stage: 'elder', until: Infinity },
];

// 1分あたりの自然減衰
const DECAY = { hunger: 7, happy: 4.5, energy: 5, clean: 3.5, bond: 0.4 };

export const SHOP = {
  gochiso: { label: 'ごちそう', cost: 12, desc: 'きげんと満腹を大きく回復' },
  mutagen: { label: 'へんいそくしんざい', cost: 45, desc: '次の交配で突然変異率アップ' },
  lens: { label: 'いでんしレンズ', cost: 28, desc: '隠れた劣性遺伝子を見破る' },
} as const;

export const BREED_COST = 30;

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

function freshStats(): Stats {
  return { hunger: 80, happy: 80, energy: 85, clean: 85, bond: 35 };
}

function stageForAge(ageDays: number): Stage {
  return STAGE_DAYS.find((s) => ageDays < s.until)!.stage;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(100, v));
}

function makeGenomon(genome: Genome, generation: number, parents: [string, string] | null): Genomon {
  const now = Date.now();
  return {
    id: uid(),
    name: randomName(),
    genome,
    bornAt: now,
    ageDays: 0,
    stage: 'baby',
    stats: freshStats(),
    generation,
    parents,
    lastTick: now,
    mutagen: false,
    lensed: false,
  };
}

function makeEgg(genome: Genome, generation: number, parents: [string, string] | null): Egg {
  return { id: uid(), genome, warmth: 0, generation, parents, createdAt: Date.now() };
}

interface GameState {
  genomons: Genomon[];
  eggs: Egg[];
  coins: number;
  activeId: string | null;
  codex: Record<string, number>; // traitKey -> 発見回数
  bestTierIndex: number; // 到達した最高レアリティ
  inventory: Inventory;
  hatchedCount: number;
  bredCount: number;
  initialized: boolean;
  lastSeen: number;

  init: () => void;
  tick: (now: number) => void;
  setActive: (id: string) => void;
  rename: (id: string, name: string) => void;

  feed: (id: string, type: 'normal' | 'gochiso') => void;
  play: (id: string) => void;
  clean: (id: string) => void;
  rest: (id: string) => void;
  pet: (id: string) => void;

  warmEgg: (id: string) => void;
  breedPair: (aId: string, bId: string) => number; // 産んだ卵の数
  release: (id: string) => void;

  buy: (kind: keyof Inventory) => void;
  applyMutagen: (id: string) => void;
  applyLens: (id: string) => void;
}

function recordCodex(codex: Record<string, number>, genome: Genome): Record<string, number> {
  const next = { ...codex };
  for (const key of phenotypeTraitKeys(genome)) next[key] = (next[key] ?? 0) + 1;
  return next;
}

export const useGame = create<GameState>()(
  persist(
    (set, get) => ({
      genomons: [],
      eggs: [],
      coins: 60,
      activeId: null,
      codex: {},
      bestTierIndex: 0,
      inventory: { gochiso: 2, mutagen: 0, lens: 0 },
      hatchedCount: 0,
      bredCount: 0,
      initialized: false,
      lastSeen: Date.now(),

      init: () => {
        const s = get();
        if (!s.initialized) {
          // スターター卵を2つ配布
          const eggs = [makeEgg(randomGenome(), 1, null), makeEgg(randomGenome(), 1, null)];
          set({ eggs, initialized: true, lastSeen: Date.now() });
        }
        get().tick(Date.now());
      },

      tick: (now) => {
        set((s) => {
          let codex = s.codex;
          let best = s.bestTierIndex;
          const genomons = s.genomons.map((g) => {
            const dtMin = Math.max(0, (now - g.lastTick) / 60_000);
            if (dtMin < 0.05) return g;
            const ageDays = g.ageDays + (now - g.lastTick) / DAY_MS;
            const stage = stageForAge(ageDays);
            const careMul = 1; // 将来の難易度調整用
            const stats: Stats = {
              hunger: clamp01(g.stats.hunger - DECAY.hunger * dtMin * careMul),
              happy: clamp01(g.stats.happy - DECAY.happy * dtMin * careMul),
              energy: clamp01(g.stats.energy - DECAY.energy * dtMin * careMul),
              clean: clamp01(g.stats.clean - DECAY.clean * dtMin * careMul),
              bond: clamp01(g.stats.bond - DECAY.bond * dtMin),
            };
            const tierIdx = TIER_ORDER.indexOf(computeRarity(g.genome).tier);
            if (tierIdx > best) best = tierIdx;
            return { ...g, ageDays, stage, stats, lastTick: now };
          });
          // 新規に成体到達したらコーデックスへ（既に発見記録済みなので tier 更新のみ）
          void codex;
          return { genomons, bestTierIndex: best, lastSeen: now };
        });
      },

      setActive: (id) => set({ activeId: id }),
      rename: (id, name) =>
        set((s) => ({ genomons: s.genomons.map((g) => (g.id === id ? { ...g, name: name.slice(0, 12) || g.name } : g)) })),

      feed: (id, type) =>
        set((s) => {
          if (type === 'gochiso' && s.inventory.gochiso <= 0) return s;
          const inv = type === 'gochiso' ? { ...s.inventory, gochiso: s.inventory.gochiso - 1 } : s.inventory;
          const dh = type === 'gochiso' ? 45 : 26;
          const dhappy = type === 'gochiso' ? 22 : 8;
          return {
            inventory: inv,
            coins: s.coins + 1,
            genomons: s.genomons.map((g) =>
              g.id === id
                ? { ...g, stats: { ...g.stats, hunger: clamp01(g.stats.hunger + dh), happy: clamp01(g.stats.happy + dhappy), bond: clamp01(g.stats.bond + 2) } }
                : g,
            ),
          };
        }),

      play: (id) =>
        set((s) => ({
          coins: s.coins + 2,
          genomons: s.genomons.map((g) =>
            g.id === id
              ? { ...g, stats: { ...g.stats, happy: clamp01(g.stats.happy + 24), energy: clamp01(g.stats.energy - 12), hunger: clamp01(g.stats.hunger - 6), bond: clamp01(g.stats.bond + 5) } }
              : g,
          ),
        })),

      clean: (id) =>
        set((s) => ({
          coins: s.coins + 1,
          genomons: s.genomons.map((g) =>
            g.id === id ? { ...g, stats: { ...g.stats, clean: 100, happy: clamp01(g.stats.happy + 6), bond: clamp01(g.stats.bond + 1) } } : g,
          ),
        })),

      rest: (id) =>
        set((s) => ({
          genomons: s.genomons.map((g) =>
            g.id === id ? { ...g, stats: { ...g.stats, energy: 100, hunger: clamp01(g.stats.hunger - 8) } } : g,
          ),
        })),

      pet: (id) =>
        set((s) => ({
          genomons: s.genomons.map((g) =>
            g.id === id ? { ...g, stats: { ...g.stats, happy: clamp01(g.stats.happy + 10), bond: clamp01(g.stats.bond + 8) } } : g,
          ),
        })),

      warmEgg: (id) =>
        set((s) => {
          const egg = s.eggs.find((e) => e.id === id);
          if (!egg) return s;
          const warmth = egg.warmth + 26;
          if (warmth < 100) {
            return { eggs: s.eggs.map((e) => (e.id === id ? { ...e, warmth } : e)) };
          }
          // 孵化
          const baby = makeGenomon(egg.genome, egg.generation, egg.parents);
          const rarity = computeRarity(egg.genome);
          const tierIdx = TIER_ORDER.indexOf(rarity.tier);
          const reward = 14 + tierIdx * 12;
          return {
            eggs: s.eggs.filter((e) => e.id !== id),
            genomons: [...s.genomons, baby],
            activeId: s.activeId ?? baby.id,
            coins: s.coins + reward,
            hatchedCount: s.hatchedCount + 1,
            codex: recordCodex(s.codex, egg.genome),
            bestTierIndex: Math.max(s.bestTierIndex, tierIdx),
          };
        }),

      breedPair: (aId, bId) => {
        const s = get();
        const a = s.genomons.find((g) => g.id === aId);
        const b = s.genomons.find((g) => g.id === bId);
        if (!a || !b || a.id === b.id) return 0;
        if (a.stage === 'baby' || a.stage === 'child' || b.stage === 'baby' || b.stage === 'child') return 0;
        if (s.coins < BREED_COST) return 0;

        const mutationRate = a.mutagen || b.mutagen ? 0.13 : 0.035;
        let count = 1;
        if (Math.random() < 0.55) count++;
        if (Math.random() < 0.2) count++;
        const generation = Math.max(a.generation, b.generation) + 1;
        const newEggs: Egg[] = [];
        for (let i = 0; i < count; i++) {
          newEggs.push(makeEgg(breed(a.genome, b.genome, { mutationRate }), generation, [a.id, b.id]));
        }
        set({
          eggs: [...s.eggs, ...newEggs],
          coins: s.coins - BREED_COST,
          bredCount: s.bredCount + 1,
          genomons: s.genomons.map((g) => (g.id === a.id || g.id === b.id ? { ...g, mutagen: false } : g)),
        });
        return count;
      },

      release: (id) =>
        set((s) => {
          const g = s.genomons.find((x) => x.id === id);
          if (!g) return s;
          const refund = 8 + TIER_ORDER.indexOf(computeRarity(g.genome).tier) * 4;
          const remaining = s.genomons.filter((x) => x.id !== id);
          return {
            genomons: remaining,
            coins: s.coins + refund,
            activeId: s.activeId === id ? remaining[0]?.id ?? null : s.activeId,
          };
        }),

      buy: (kind) =>
        set((s) => {
          const cost = SHOP[kind].cost;
          if (s.coins < cost) return s;
          return { coins: s.coins - cost, inventory: { ...s.inventory, [kind]: s.inventory[kind] + 1 } };
        }),

      applyMutagen: (id) =>
        set((s) => {
          if (s.inventory.mutagen <= 0) return s;
          return {
            inventory: { ...s.inventory, mutagen: s.inventory.mutagen - 1 },
            genomons: s.genomons.map((g) => (g.id === id ? { ...g, mutagen: true } : g)),
          };
        }),

      applyLens: (id) =>
        set((s) => {
          if (s.inventory.lens <= 0) return s;
          return {
            inventory: { ...s.inventory, lens: s.inventory.lens - 1 },
            genomons: s.genomons.map((g) => (g.id === id ? { ...g, lensed: true } : g)),
          };
        }),
    }),
    {
      name: 'genomone-save-v1',
      storage: createJSONStorage(() => localStorage),
      version: 1,
    },
  ),
);
