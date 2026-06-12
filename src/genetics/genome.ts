import { GENES, GENE_MAP, DiscreteGene, AdditiveGene } from './genes';

export type DiscreteLocus = [string, string];
export type AdditiveLocus = [number, number];

export interface Genome {
  discrete: Record<string, DiscreteLocus>;
  additive: Record<string, AdditiveLocus>;
}

export interface Phenotype {
  bodyShape: string;
  baseColor: string;
  pattern: string;
  patternColor: string;
  earType: string;
  eyeType: string;
  pupilType: string;
  eyeColor: string;
  sclera: string;
  lashType: string;
  eyeMark: string;
  mouthType: string;
  cheekType: string;
  tailType: string;
  limbType: string;
  hornType: string;
  wingType: string;
  aura: string;
  temperament: string;
  size: number;
  plump: number;
  eyeSize: number;
  eyeSpacing: number;
  shade: number;
}

const DISCRETE_GENES = GENES.filter((g): g is DiscreteGene => g.kind === 'discrete');
const ADDITIVE_GENES = GENES.filter((g): g is AdditiveGene => g.kind === 'additive');

function rand(): number {
  return Math.random();
}

function weightedPick(alleles: DiscreteGene['alleles']): string {
  const total = alleles.reduce((s, a) => s + a.weight, 0);
  let r = rand() * total;
  for (const a of alleles) {
    r -= a.weight;
    if (r <= 0) return a.id;
  }
  return alleles[alleles.length - 1].id;
}

// 突然変異時の対立遺伝子抽選。まれにレア形質が新規に湧くよう、レアにも僅かな確率を残す。
function mutateAllele(gene: DiscreteGene): string {
  return weightedPick(gene.alleles);
}

export function randomGenome(): Genome {
  const discrete: Record<string, DiscreteLocus> = {};
  for (const g of DISCRETE_GENES) {
    discrete[g.key] = [weightedPick(g.alleles), weightedPick(g.alleles)];
  }
  const additive: Record<string, AdditiveLocus> = {};
  for (const g of ADDITIVE_GENES) {
    const span = g.initMax - g.initMin;
    additive[g.key] = [g.initMin + rand() * span, g.initMin + rand() * span];
  }
  return { discrete, additive };
}

// 発現：離散遺伝子は優性度(dom)が高い対立遺伝子が表に出る。同値なら先のものを採用。
function expressDiscrete(gene: DiscreteGene, locus: DiscreteLocus): string {
  const [x, y] = locus;
  const ax = gene.alleles.find((a) => a.id === x) ?? gene.alleles[0];
  const ay = gene.alleles.find((a) => a.id === y) ?? gene.alleles[0];
  return ax.dom >= ay.dom ? ax.id : ay.id;
}

export function expressGenome(genome: Genome): Phenotype {
  const p: Record<string, string | number> = {};
  for (const g of DISCRETE_GENES) {
    p[g.key] = expressDiscrete(g, genome.discrete[g.key] ?? ['none', 'none']);
  }
  for (const g of ADDITIVE_GENES) {
    const [a, b] = genome.additive[g.key] ?? [0, 0];
    p[g.key] = clamp((a + b) / 2, g.min, g.max);
  }
  return p as unknown as Phenotype;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export interface BreedOptions {
  mutationRate?: number; // 1対立遺伝子あたりの変異確率（既定 0.035）
}

export function breed(a: Genome, b: Genome, opts: BreedOptions = {}): Genome {
  const rate = opts.mutationRate ?? 0.035;
  const discrete: Record<string, DiscreteLocus> = {};
  for (const g of DISCRETE_GENES) {
    const la = a.discrete[g.key] ?? ['none', 'none'];
    const lb = b.discrete[g.key] ?? ['none', 'none'];
    let g1 = la[rand() < 0.5 ? 0 : 1];
    let g2 = lb[rand() < 0.5 ? 0 : 1];
    if (rand() < rate) g1 = mutateAllele(g);
    if (rand() < rate) g2 = mutateAllele(g);
    discrete[g.key] = [g1, g2];
  }
  const additive: Record<string, AdditiveLocus> = {};
  for (const g of ADDITIVE_GENES) {
    const la = a.additive[g.key] ?? [0, 0];
    const lb = b.additive[g.key] ?? [0, 0];
    let v1 = la[rand() < 0.5 ? 0 : 1];
    let v2 = lb[rand() < 0.5 ? 0 : 1];
    if (rand() < rate) v1 += (rand() * 2 - 1) * g.step * 2;
    if (rand() < rate) v2 += (rand() * 2 - 1) * g.step * 2;
    additive[g.key] = [clamp(v1, g.min, g.max), clamp(v2, g.min, g.max)];
  }
  return { discrete, additive };
}

// ── レアリティ算出 ───────────────────────────────────────────────
// 発現しているレア形質に得点を付与。さらに「隠れた劣性レア」も潜在点として僅かに加算。
const RARITY_POINTS: Record<string, number> = {
  aura: 42,
  wingType: 20,
  hornType: 15,
  bodyShape: 16,
  eyeType: 15,
  pupilType: 14,
  pattern: 13,
  baseColor: 12,
  eyeColor: 11,
  sclera: 11,
  tailType: 11,
  cheekType: 9,
  eyeMark: 9,
  earType: 8,
  mouthType: 7,
  temperament: 6,
};

const AURA_BONUS: Record<string, number> = { rainbow: 30, starfield: 30, glow: 10 };

export interface RarityInfo {
  score: number;
  tier: RarityTier;
  hiddenRares: number; // 隠れている劣性レアの数
}

export type RarityTier = 'コモン' | 'アンコモン' | 'レア' | 'エピック' | 'レジェンダリー' | 'ミシック';

export const TIER_ORDER: RarityTier[] = ['コモン', 'アンコモン', 'レア', 'エピック', 'レジェンダリー', 'ミシック'];

export const TIER_COLOR: Record<RarityTier, string> = {
  コモン: '#9aa6b2',
  アンコモン: '#5bb56a',
  レア: '#4b9ef0',
  エピック: '#a45ff0',
  レジェンダリー: '#f0a93a',
  ミシック: '#ff5fa8',
};

export function computeRarity(genome: Genome): RarityInfo {
  const pheno = expressGenome(genome);
  let score = 0;
  let hidden = 0;
  for (const g of DISCRETE_GENES) {
    const expressed = pheno[g.key as keyof Phenotype] as string;
    const allele = g.alleles.find((a) => a.id === expressed);
    if (allele?.rare) {
      score += RARITY_POINTS[g.key] ?? 8;
      if (g.key === 'aura') score += AURA_BONUS[expressed] ?? 0;
    }
    // 隠れ劣性レア（持っているが発現していない）
    for (const al of genome.discrete[g.key] ?? []) {
      if (al !== expressed && g.alleles.find((a) => a.id === al)?.rare) {
        hidden += 1;
        score += 2;
      }
    }
  }
  return { score: Math.round(score), tier: scoreToTier(score), hiddenRares: hidden };
}

function scoreToTier(score: number): RarityTier {
  if (score >= 110) return 'ミシック';
  if (score >= 68) return 'レジェンダリー';
  if (score >= 38) return 'エピック';
  if (score >= 18) return 'レア';
  if (score >= 7) return 'アンコモン';
  return 'コモン';
}

// 図鑑用：発現している全形質キー（gene:allele）を返す
export function phenotypeTraitKeys(genome: Genome): string[] {
  const pheno = expressGenome(genome);
  return DISCRETE_GENES.map((g) => `${g.key}:${pheno[g.key as keyof Phenotype]}`);
}

export { GENE_MAP, DISCRETE_GENES, ADDITIVE_GENES };
