import { BODY_PALETTES, IRISES, SCLERAS } from './palettes';

// ── 遺伝子レジストリ ───────────────────────────────────────────────
// 離散遺伝子は「優劣（dom）」を持ち、対立遺伝子のうち dom が高い方が発現する。
// 劣性のレア形質は dom と出現頻度(weight)を低くしてあるので、選抜交配で掘り当てる楽しさが出る。
// 連続遺伝子（additive）は2つの対立遺伝子の平均で表現型が決まる（ポリジーン的）。

export interface DiscreteAllele {
  id: string;
  label: string;
  dom: number;
  weight: number;
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
  step: number;
}

export type Gene = DiscreteGene | AdditiveGene;

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

// パレット系（多対立）を対立遺伝子化。レアは劣性＆低頻度に。
function paletteAlleles(
  list: { id: string; label: string; rare?: boolean }[],
  commonDom: number,
): DiscreteAllele[] {
  return list.map((p) => ({
    id: p.id,
    label: p.label,
    dom: p.rare ? commonDom - 7 : commonDom + (Math.abs(hash(p.id)) % 6),
    weight: p.rare ? 4 : 22,
    rare: p.rare,
  }));
}

export const GENES: Gene[] = [
  {
    key: 'bodyShape',
    label: 'たいけい',
    kind: 'discrete',
    alleles: [
      { id: 'blob', label: 'ぷるん', dom: 10, weight: 24 },
      { id: 'round', label: 'まんまる', dom: 9, weight: 24 },
      { id: 'mochi', label: 'おもち', dom: 8, weight: 20 },
      { id: 'pear', label: 'おむすび', dom: 7, weight: 16 },
      { id: 'bean', label: 'まめ', dom: 6, weight: 15 },
      { id: 'egg', label: 'たまご', dom: 6, weight: 15 },
      { id: 'droplet', label: 'しずく', dom: 5, weight: 11 },
      { id: 'marshmallow', label: 'かくまる', dom: 4, weight: 11 },
      { id: 'star', label: 'おほし', dom: 2, weight: 4, rare: true },
    ],
  },
  { key: 'baseColor', label: 'からだのいろ', kind: 'discrete', alleles: paletteAlleles(BODY_PALETTES, 14) },
  {
    key: 'pattern',
    label: 'もよう',
    kind: 'discrete',
    alleles: [
      { id: 'none', label: 'むじ', dom: 12, weight: 26 },
      { id: 'belly', label: 'おなか', dom: 10, weight: 22 },
      { id: 'spots', label: 'みずたま', dom: 8, weight: 16 },
      { id: 'patch', label: 'ぶち', dom: 7, weight: 13 },
      { id: 'dapple', label: 'まだら', dom: 7, weight: 12 },
      { id: 'cow', label: 'うしがら', dom: 6, weight: 11 },
      { id: 'tiger', label: 'とらがら', dom: 6, weight: 11 },
      { id: 'stripes', label: 'しましま', dom: 6, weight: 11 },
      { id: 'socks', label: 'くつした', dom: 6, weight: 11 },
      { id: 'freckle', label: 'そばかす', dom: 5, weight: 9 },
      { id: 'starmark', label: 'おほしさま', dom: 3, weight: 5, rare: true },
      { id: 'heartmark', label: 'はぁと', dom: 3, weight: 5, rare: true },
      { id: 'galaxy', label: 'せいうん', dom: 2, weight: 4, rare: true },
    ],
  },
  { key: 'patternColor', label: 'もようのいろ', kind: 'discrete', alleles: paletteAlleles(BODY_PALETTES, 13) },
  {
    key: 'earType',
    label: 'おみみ',
    kind: 'discrete',
    alleles: [
      { id: 'round', label: 'まるみみ', dom: 11, weight: 22 },
      { id: 'cat', label: 'ねこみみ', dom: 10, weight: 22 },
      { id: 'fluffy', label: 'もふみみ', dom: 9, weight: 17 },
      { id: 'bunny', label: 'うさみみ', dom: 8, weight: 15 },
      { id: 'floppy', label: 'たれみみ', dom: 7, weight: 14 },
      { id: 'fox', label: 'きつね', dom: 7, weight: 13 },
      { id: 'fin', label: 'ひれ', dom: 5, weight: 9 },
      { id: 'tuft', label: 'ふさみみ', dom: 5, weight: 9 },
      { id: 'antenna', label: 'しょっかく', dom: 3, weight: 5, rare: true },
      { id: 'none', label: 'なし', dom: 6, weight: 9 },
    ],
  },
  {
    key: 'eyeType',
    label: 'めのかたち',
    kind: 'discrete',
    alleles: [
      { id: 'round', label: 'まんまる', dom: 11, weight: 22 },
      { id: 'almond', label: 'アーモンド', dom: 10, weight: 20 },
      { id: 'upturn', label: 'つりめ', dom: 9, weight: 17 },
      { id: 'droopy', label: 'たれめ', dom: 8, weight: 16 },
      { id: 'wide', label: 'ぱっちり', dom: 8, weight: 16 },
      { id: 'sharp', label: 'シャープ', dom: 6, weight: 12 },
      { id: 'sleepy', label: 'はんがん', dom: 6, weight: 11 },
      { id: 'jewel', label: 'ほうせき', dom: 3, weight: 5, rare: true },
    ],
  },
  {
    key: 'pupilType',
    label: 'ひとみ',
    kind: 'discrete',
    alleles: [
      { id: 'round', label: 'まる', dom: 11, weight: 26 },
      { id: 'big', label: 'おおきめ', dom: 10, weight: 22 },
      { id: 'slit', label: 'たてぼそ', dom: 8, weight: 16 },
      { id: 'sparkle', label: 'きらきら', dom: 7, weight: 14 },
      { id: 'heart', label: 'はぁと', dom: 3, weight: 6, rare: true },
      { id: 'star', label: 'おほし', dom: 3, weight: 6, rare: true },
    ],
  },
  { key: 'eyeColor', label: 'ひとみのいろ', kind: 'discrete', alleles: paletteAlleles(IRISES, 12) },
  { key: 'sclera', label: 'しろめ', kind: 'discrete', alleles: paletteAlleles(SCLERAS, 13) },
  {
    key: 'lashType',
    label: 'まつげ',
    kind: 'discrete',
    alleles: [
      { id: 'none', label: 'なし', dom: 10, weight: 24 },
      { id: 'natural', label: 'ナチュラル', dom: 9, weight: 22 },
      { id: 'long', label: 'ロング', dom: 8, weight: 16 },
      { id: 'glam', label: 'ぱっちり', dom: 7, weight: 13 },
      { id: 'both', label: 'うえした', dom: 6, weight: 10 },
    ],
  },
  {
    key: 'eyeMark',
    label: 'めもとマーク',
    kind: 'discrete',
    alleles: [
      { id: 'none', label: 'なし', dom: 12, weight: 30 },
      { id: 'patch', label: 'めパッチ', dom: 8, weight: 16 },
      { id: 'liner', label: 'アイライン', dom: 7, weight: 14 },
      { id: 'tear', label: 'なみだぼくろ', dom: 6, weight: 12 },
      { id: 'under', label: 'したまぶた', dom: 6, weight: 12 },
      { id: 'mask', label: 'マスク', dom: 4, weight: 8, rare: true },
    ],
  },
  {
    key: 'mouthType',
    label: 'おくち',
    kind: 'discrete',
    alleles: [
      { id: 'smile', label: 'にこ', dom: 11, weight: 22 },
      { id: 'smol', label: 'ちょん', dom: 10, weight: 20 },
      { id: 'cat', label: 'にゃん', dom: 8, weight: 16 },
      { id: 'smirk', label: 'にやり', dom: 7, weight: 13 },
      { id: 'grin', label: 'にぱっ', dom: 7, weight: 13 },
      { id: 'omouth', label: 'ぽけ', dom: 7, weight: 12 },
      { id: 'tongue', label: 'てへぺろ', dom: 6, weight: 11 },
      { id: 'fang', label: 'やえば', dom: 4, weight: 8, rare: true },
      { id: 'beak', label: 'くちばし', dom: 3, weight: 6, rare: true },
    ],
  },
  {
    key: 'cheekType',
    label: 'ほっぺ',
    kind: 'discrete',
    alleles: [
      { id: 'blush', label: 'ぽっ', dom: 10, weight: 24 },
      { id: 'none', label: 'なし', dom: 9, weight: 20 },
      { id: 'round', label: 'まるぽっ', dom: 8, weight: 16 },
      { id: 'freckle', label: 'そばかす', dom: 7, weight: 13 },
      { id: 'swirl', label: 'ぐるぐる', dom: 5, weight: 9 },
      { id: 'heart', label: 'はぁと', dom: 3, weight: 6, rare: true },
      { id: 'star', label: 'おほし', dom: 3, weight: 6, rare: true },
    ],
  },
  {
    key: 'tailType',
    label: 'しっぽ',
    kind: 'discrete',
    alleles: [
      { id: 'none', label: 'なし', dom: 10, weight: 18 },
      { id: 'fluffy', label: 'もふもふ', dom: 9, weight: 18 },
      { id: 'cat', label: 'ねこじゃらし', dom: 8, weight: 16 },
      { id: 'curl', label: 'くるりん', dom: 8, weight: 15 },
      { id: 'fox', label: 'きつね', dom: 7, weight: 13 },
      { id: 'bushy', label: 'ふさふさ', dom: 6, weight: 11 },
      { id: 'long', label: 'ながめ', dom: 6, weight: 11 },
      { id: 'leaf', label: 'はっぱ', dom: 4, weight: 7, rare: true },
      { id: 'star', label: 'おほし', dom: 2, weight: 4, rare: true },
    ],
  },
  {
    key: 'limbType',
    label: 'てあし',
    kind: 'discrete',
    alleles: [
      { id: 'nub', label: 'ちょこん', dom: 11, weight: 28 },
      { id: 'paw', label: 'おてて', dom: 9, weight: 22 },
      { id: 'foot', label: 'あんよ', dom: 8, weight: 18 },
      { id: 'stub', label: 'ぷに', dom: 8, weight: 16 },
      { id: 'none', label: 'なし', dom: 6, weight: 12 },
    ],
  },
  {
    key: 'hornType',
    label: 'つの',
    kind: 'discrete',
    alleles: [
      { id: 'none', label: 'なし', dom: 13, weight: 58 },
      { id: 'nub', label: 'ちょこん', dom: 6, weight: 13 },
      { id: 'curl', label: 'ひつじ', dom: 5, weight: 9 },
      { id: 'antler', label: 'えだづの', dom: 4, weight: 7, rare: true },
      { id: 'unicorn', label: 'いっかく', dom: 3, weight: 6, rare: true },
      { id: 'devil', label: 'こあくま', dom: 3, weight: 6, rare: true },
    ],
  },
  {
    key: 'wingType',
    label: 'はね',
    kind: 'discrete',
    alleles: [
      { id: 'none', label: 'なし', dom: 13, weight: 62 },
      { id: 'fairy', label: 'ようせい', dom: 4, weight: 9, rare: true },
      { id: 'feather', label: 'はばたき', dom: 4, weight: 8, rare: true },
      { id: 'bat', label: 'こうもり', dom: 3, weight: 6, rare: true },
      { id: 'bee', label: 'みつばち', dom: 3, weight: 5, rare: true },
      { id: 'butterfly', label: 'ちょうちょ', dom: 3, weight: 5, rare: true },
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
  { key: 'eyeSize', label: 'めのおおきさ', kind: 'additive', min: 0.82, max: 1.32, initMin: 0.94, initMax: 1.16, step: 0.07 },
  { key: 'eyeSpacing', label: 'めのかんかく', kind: 'additive', min: 0.32, max: 0.52, initMin: 0.37, initMax: 0.45, step: 0.03 },
  { key: 'shade', label: 'いろのこさ', kind: 'additive', min: -16, max: 16, initMin: -8, initMax: 8, step: 4 },
];

export const GENE_MAP: Record<string, Gene> = Object.fromEntries(GENES.map((g) => [g.key, g]));

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
