import { BODY_PALETTES, EYE_PALETTES } from './palettes';

// ── 遺伝子レジストリ ───────────────────────────────────────────────
// 離散遺伝子は「優劣（dom）」を持ち、対立遺伝子のうち dom が高い方が発現する。
// 劣性のレア形質は dom と出現頻度(weight)を低くしてあるので、選抜交配で掘り当てる楽しさが出る。
// 連続遺伝子（additive）は2つの対立遺伝子の平均で表現型が決まる（ポリジーン的）。

export interface DiscreteAllele {
  id: string;
  label: string;
  dom: number; // 優性度（高いほど発現しやすい）
  weight: number; // 初期ランダムプールでの出現頻度
  rare?: boolean;
}

export interface DiscreteGene {
  key: string;
  label: string;
  kind: 'discrete';
  alleles: DiscreteAllele[];
}

export interface AdditiveGene {
  key: string;
  label: string;
  kind: 'additive';
  min: number;
  max: number;
  initMin: number;
  initMax: number;
  step: number; // 突然変異時の揺らぎ幅
}

export type Gene = DiscreteGene | AdditiveGene;

const paletteAlleles = (
  list: typeof BODY_PALETTES,
  commonDom: number,
): DiscreteAllele[] =>
  list.map((p) => ({
    id: p.id,
    label: p.label,
    dom: p.rare ? commonDom - 6 : commonDom + (Math.abs(hash(p.id)) % 5),
    weight: p.rare ? 4 : 24,
    rare: p.rare,
  }));

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

export const GENES: Gene[] = [
  {
    key: 'bodyShape',
    label: 'たいけい',
    kind: 'discrete',
    alleles: [
      { id: 'blob', label: 'ぷるん', dom: 10, weight: 26 },
      { id: 'round', label: 'まんまる', dom: 9, weight: 26 },
      { id: 'mochi', label: 'おもち', dom: 8, weight: 22 },
      { id: 'pear', label: 'おむすび', dom: 7, weight: 18 },
      { id: 'bean', label: 'まめ', dom: 6, weight: 16 },
      { id: 'droplet', label: 'しずく', dom: 5, weight: 12 },
      { id: 'marshmallow', label: 'かくまる', dom: 4, weight: 12 },
      { id: 'star', label: 'おほし', dom: 2, weight: 4, rare: true },
    ],
  },
  {
    key: 'baseColor',
    label: 'からだのいろ',
    kind: 'discrete',
    alleles: paletteAlleles(BODY_PALETTES, 14),
  },
  {
    key: 'pattern',
    label: 'もよう',
    kind: 'discrete',
    alleles: [
      { id: 'none', label: 'むじ', dom: 12, weight: 30 },
      { id: 'belly', label: 'おなか', dom: 10, weight: 24 },
      { id: 'spots', label: 'みずたま', dom: 8, weight: 18 },
      { id: 'patch', label: 'ぶち', dom: 7, weight: 14 },
      { id: 'stripes', label: 'しましま', dom: 6, weight: 12 },
      { id: 'freckle', label: 'そばかす', dom: 5, weight: 10 },
      { id: 'starmark', label: 'おほしさま', dom: 3, weight: 5, rare: true },
      { id: 'heartmark', label: 'はぁと', dom: 3, weight: 5, rare: true },
    ],
  },
  {
    key: 'patternColor',
    label: 'もようのいろ',
    kind: 'discrete',
    alleles: paletteAlleles(BODY_PALETTES, 13),
  },
  {
    key: 'earType',
    label: 'おみみ',
    kind: 'discrete',
    alleles: [
      { id: 'round', label: 'まるみみ', dom: 11, weight: 24 },
      { id: 'cat', label: 'ねこみみ', dom: 10, weight: 22 },
      { id: 'fluffy', label: 'もふみみ', dom: 9, weight: 18 },
      { id: 'bunny', label: 'たれうさ', dom: 8, weight: 16 },
      { id: 'floppy', label: 'たれみみ', dom: 7, weight: 14 },
      { id: 'fin', label: 'ひれ', dom: 5, weight: 10 },
      { id: 'antenna', label: 'しょっかく', dom: 3, weight: 6, rare: true },
      { id: 'none', label: 'なし', dom: 6, weight: 10 },
    ],
  },
  {
    key: 'eyeType',
    label: 'おめめ',
    kind: 'discrete',
    alleles: [
      { id: 'round', label: 'まんまる', dom: 11, weight: 26 },
      { id: 'sparkle', label: 'きらきら', dom: 9, weight: 20 },
      { id: 'wide', label: 'おおきめ', dom: 8, weight: 18 },
      { id: 'button', label: 'ぼたん', dom: 7, weight: 14 },
      { id: 'droopy', label: 'たれめ', dom: 6, weight: 12 },
      { id: 'sleepy', label: 'ねむねむ', dom: 5, weight: 10 },
      { id: 'star', label: 'おほしめ', dom: 2, weight: 4, rare: true },
    ],
  },
  {
    key: 'eyeColor',
    label: 'ひとみのいろ',
    kind: 'discrete',
    alleles: paletteAlleles(EYE_PALETTES, 12),
  },
  {
    key: 'mouthType',
    label: 'おくち',
    kind: 'discrete',
    alleles: [
      { id: 'smile', label: 'にこ', dom: 11, weight: 26 },
      { id: 'smol', label: 'ちょん', dom: 10, weight: 22 },
      { id: 'cat', label: 'にゃん', dom: 8, weight: 18 },
      { id: 'omouth', label: 'ぽけ', dom: 7, weight: 16 },
      { id: 'tongue', label: 'てへぺろ', dom: 6, weight: 12 },
      { id: 'fang', label: 'やえば', dom: 4, weight: 8, rare: true },
      { id: 'beak', label: 'くちばし', dom: 3, weight: 6, rare: true },
    ],
  },
  {
    key: 'cheekType',
    label: 'ほっぺ',
    kind: 'discrete',
    alleles: [
      { id: 'blush', label: 'ぽっ', dom: 10, weight: 26 },
      { id: 'none', label: 'なし', dom: 9, weight: 22 },
      { id: 'freckle', label: 'そばかす', dom: 7, weight: 14 },
      { id: 'swirl', label: 'ぐるぐる', dom: 5, weight: 10 },
      { id: 'heart', label: 'はぁと', dom: 3, weight: 6, rare: true },
      { id: 'star', label: 'おほし', dom: 3, weight: 6, rare: true },
    ],
  },
  {
    key: 'tailType',
    label: 'しっぽ',
    kind: 'discrete',
    alleles: [
      { id: 'none', label: 'なし', dom: 10, weight: 22 },
      { id: 'fluffy', label: 'もふもふ', dom: 9, weight: 20 },
      { id: 'curl', label: 'くるりん', dom: 8, weight: 18 },
      { id: 'long', label: 'ながめ', dom: 7, weight: 16 },
      { id: 'bushy', label: 'ふさふさ', dom: 6, weight: 12 },
      { id: 'leaf', label: 'はっぱ', dom: 4, weight: 8, rare: true },
      { id: 'star', label: 'おほし', dom: 2, weight: 4, rare: true },
    ],
  },
  {
    key: 'hornType',
    label: 'つの',
    kind: 'discrete',
    alleles: [
      { id: 'none', label: 'なし', dom: 13, weight: 60 },
      { id: 'nub', label: 'ちょこん', dom: 6, weight: 14 },
      { id: 'antler', label: 'えだづの', dom: 4, weight: 8, rare: true },
      { id: 'unicorn', label: 'いっかく', dom: 3, weight: 6, rare: true },
      { id: 'devil', label: 'こあくま', dom: 3, weight: 6, rare: true },
    ],
  },
  {
    key: 'wingType',
    label: 'はね',
    kind: 'discrete',
    alleles: [
      { id: 'none', label: 'なし', dom: 13, weight: 64 },
      { id: 'fairy', label: 'ようせい', dom: 4, weight: 9, rare: true },
      { id: 'feather', label: 'はばたき', dom: 4, weight: 8, rare: true },
      { id: 'bat', label: 'こうもり', dom: 3, weight: 6, rare: true },
      { id: 'bee', label: 'みつばち', dom: 3, weight: 5, rare: true },
    ],
  },
  {
    key: 'aura',
    label: 'オーラ',
    kind: 'discrete',
    alleles: [
      { id: 'none', label: 'なし', dom: 15, weight: 90 },
      { id: 'sparkle', label: 'きらめき', dom: 3, weight: 6, rare: true },
      { id: 'glow', label: 'ほのか', dom: 2, weight: 4, rare: true },
      { id: 'rainbow', label: 'にじいろ', dom: 1, weight: 2, rare: true },
      { id: 'starfield', label: 'せいうん', dom: 1, weight: 2, rare: true },
    ],
  },
  {
    key: 'temperament',
    label: 'せいかく',
    kind: 'discrete',
    alleles: [
      { id: 'genki', label: 'げんき', dom: 8, weight: 18 },
      { id: 'playful', label: 'あそびずき', dom: 8, weight: 16 },
      { id: 'calm', label: 'おっとり', dom: 8, weight: 16 },
      { id: 'shy', label: 'はずかしがり', dom: 7, weight: 14 },
      { id: 'gluttonous', label: 'くいしんぼ', dom: 7, weight: 14 },
      { id: 'lazy', label: 'のんびり', dom: 7, weight: 12 },
      { id: 'brave', label: 'ゆうかん', dom: 6, weight: 10 },
      { id: 'dreamy', label: 'ゆめみがち', dom: 5, weight: 8 },
    ],
  },
  // ── 連続遺伝子（ポリジーン） ──
  { key: 'size', label: 'おおきさ', kind: 'additive', min: 0.78, max: 1.3, initMin: 0.9, initMax: 1.12, step: 0.06 },
  { key: 'plump', label: 'ぽっちゃり', kind: 'additive', min: 0, max: 1, initMin: 0.3, initMax: 0.7, step: 0.12 },
  { key: 'eyeSize', label: 'ひとみのおおきさ', kind: 'additive', min: 0.82, max: 1.28, initMin: 0.92, initMax: 1.12, step: 0.07 },
  { key: 'shade', label: 'いろのこさ', kind: 'additive', min: -16, max: 16, initMin: -8, initMax: 8, step: 4 },
];

export const GENE_MAP: Record<string, Gene> = Object.fromEntries(
  GENES.map((g) => [g.key, g]),
);

export function alleleLabel(geneKey: string, alleleId: string): string {
  const g = GENE_MAP[geneKey];
  if (!g || g.kind !== 'discrete') return alleleId;
  return g.alleles.find((a) => a.id === alleleId)?.label ?? alleleId;
}

export function isRareAllele(geneKey: string, alleleId: string): boolean {
  const g = GENE_MAP[geneKey];
  if (!g || g.kind !== 'discrete') return false;
  return !!g.alleles.find((a) => a.id === alleleId)?.rare;
}
