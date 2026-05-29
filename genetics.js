/* ============================================================================
 * GENOMONE - 遺伝エンジン (genetics.js)
 *
 * ゲノモンは二倍体(diploid)の生き物。
 *   - 量的形質(QTL): 複数遺伝子座の相加効果で能力値が決まる（ポリジーン）
 *   - 質的形質: メンデル遺伝（優性順位・不完全優性）で見た目が決まる
 *       体色 / 模様(しま・水玉・無地) / ツノ / 目の形 / 体型 / ✨シャイニー
 * 配偶子形成(減数分裂)では各座位からランダムに1アレルを選び、低確率で突然変異。
 *
 * ★設計思想（ガチ要素）:
 *   表現型 P = 遺伝的能力 G + 環境偏差 E + 育成補正 + トレーニング
 *   見えるのは P。子に伝わるのは G(遺伝子)だけ。選抜眼が問われる。
 * ========================================================================== */

const GN = (() => {
  'use strict';

  // ---- 設定 ---------------------------------------------------------------
  const BATTLE_STATS = ['power', 'speed', 'stamina', 'guts'];
  const QUANT_TRAITS = [...BATTLE_STATS, 'size'];
  const STAT_LABEL = {
    power: 'ちから', speed: 'すばやさ', stamina: 'たいりょく',
    guts: 'こんじょう', size: 'たいかく',
  };

  const LOCI_PER_TRAIT = 5;
  const ALLELE_MAX = 4;
  const TRAIT_MAX_SUM = LOCI_PER_TRAIT * 2 * ALLELE_MAX; // 40

  // 体色（優性順位制）
  const COLOR_ALLELES = ['R', 'B', 'G', 'Y', 'P', 'C']; // 赤青緑黄 桃 水
  const COLOR_RANK = { R: 6, B: 5, G: 4, Y: 3, P: 2, C: 1 };
  const COLOR_NAME = { R: 'もも赤', B: 'そら青', G: 'わか緑', Y: 'たまご黄', P: 'ゆめ桃', C: 'みず色' };
  const COLOR_HEX  = { R: '#ff7a8a', B: '#5aa9ff', G: '#4ed99a', Y: '#ffd84d', P: '#ff9ad5', C: '#73e0d8' };

  // 模様（優性順位: しま > 水玉 > 無地）
  const PAT_ALLELES = ['T', 'D', 'p'];
  const PAT_RANK = { T: 3, D: 2, p: 1 };
  const PAT_NAME = { T: 'しま', D: 'みずたま', p: 'むじ' };

  // 目の形（優性順位）
  const EYE_ALLELES = ['O', 'S', 'L', 'U'];
  const EYE_RANK = { O: 4, S: 3, L: 2, U: 1 };
  const EYE_NAME = { O: 'まんまる', S: 'きらきら', L: 'たれめ', U: 'ねむそう' };

  // 体型（優性順位: まる > のっぽ > ずんぐり）
  const SHAPE_ALLELES = ['r', 't', 'w'];
  const SHAPE_RANK = { r: 3, t: 2, w: 1 };
  const SHAPE_NAME = { r: 'まるがた', t: 'のっぽがた', w: 'ずんぐりがた' };

  // 突然変異率
  const MUT_QUANT = 0.018;   // 量的アレル ±1
  const MUT_COLOR = 0.012;   // 体色
  const MUT_MENDEL = 0.012;  // 模様・ツノ・目・体型
  const MUT_SHINY = 0.006;   // ✨シャイニー(レア)出現

  // ---- ユーティリティ -----------------------------------------------------
  const rnd = () => Math.random();
  const randint = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const choice = (arr) => arr[Math.floor(rnd() * arr.length)];
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  function gauss(mean = 0, sd = 1) {
    let u = 0, v = 0;
    while (u === 0) u = rnd();
    while (v === 0) v = rnd();
    return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  const topAllele = (pair, rank) => (rank[pair[0]] >= rank[pair[1]] ? pair[0] : pair[1]);

  // ---- 創始ゲノム ---------------------------------------------------------
  function founderGenome() {
    const q = {};
    for (const t of QUANT_TRAITS) {
      q[t] = [];
      for (let i = 0; i < LOCI_PER_TRAIT; i++) q[t].push([randint(0, 2), randint(0, 2)]);
    }
    return {
      q,
      color:   [choice(COLOR_ALLELES), choice(COLOR_ALLELES)],
      pattern: [choice(PAT_ALLELES), choice(PAT_ALLELES)],
      horn:    [choice(['H', 'h']), choice(['H', 'h'])], // 不完全優性
      eye:     [choice(EYE_ALLELES), choice(EYE_ALLELES)],
      shape:   [choice(SHAPE_ALLELES), choice(SHAPE_ALLELES)],
      special: ['n', 'n'], // 'X'=シャイニー（突然変異でのみ出現）
    };
  }

  // ---- 減数分裂 + 突然変異 ------------------------------------------------
  function pick(pair) { return pair[Math.floor(rnd() * 2)]; }
  function makeGamete(genome) {
    const q = {};
    for (const t of QUANT_TRAITS) {
      q[t] = genome.q[t].map((locus) => {
        let a = locus[Math.floor(rnd() * 2)];
        if (rnd() < MUT_QUANT) a = clamp(a + (rnd() < 0.5 ? -1 : 1), 0, ALLELE_MAX);
        return a;
      });
    }
    let color = pick(genome.color);
    if (rnd() < MUT_COLOR) color = choice(COLOR_ALLELES);
    let pattern = pick(genome.pattern);
    if (rnd() < MUT_MENDEL) pattern = choice(PAT_ALLELES);
    let horn = pick(genome.horn);
    if (rnd() < MUT_MENDEL) horn = horn === 'H' ? 'h' : 'H';
    let eye = pick(genome.eye);
    if (rnd() < MUT_MENDEL) eye = choice(EYE_ALLELES);
    let shape = pick(genome.shape);
    if (rnd() < MUT_MENDEL) shape = choice(SHAPE_ALLELES);
    let special = pick(genome.special || ['n', 'n']);
    if (special === 'n' && rnd() < MUT_SHINY) special = 'X';
    return { q, color, pattern, horn, eye, shape, special };
  }

  // ---- 受精 ---------------------------------------------------------------
  function fertilize(g1, g2) {
    const q = {};
    for (const t of QUANT_TRAITS) q[t] = g1.q[t].map((a, i) => [a, g2.q[t][i]]);
    return {
      q,
      color:   [g1.color, g2.color],
      pattern: [g1.pattern, g2.pattern],
      horn:    [g1.horn, g2.horn],
      eye:     [g1.eye, g2.eye],
      shape:   [g1.shape, g2.shape],
      special: [g1.special, g2.special],
    };
  }

  // ---- 真の遺伝的能力 G (0..100) -----------------------------------------
  function breedingValue(genome, trait) {
    const sum = genome.q[trait].reduce((s, l) => s + l[0] + l[1], 0);
    return Math.round((sum / TRAIT_MAX_SUM) * 100);
  }

  // ---- 表現型 -------------------------------------------------------------
  function phenotype(genome) {
    const g = genome;
    const ca = topAllele(g.color, COLOR_RANK);
    const pa = topAllele(g.pattern, PAT_RANK);
    const ea = topAllele(g.eye || ['O', 'O'], EYE_RANK);
    const sa = topAllele(g.shape || ['r', 'r'], SHAPE_RANK);
    const hornCount = (g.horn || ['h', 'h']).filter((a) => a === 'H').length;
    const shiny = (g.special || ['n', 'n']).includes('X');
    return {
      colorAllele: ca, colorName: COLOR_NAME[ca], colorHex: COLOR_HEX[ca],
      colorHomo: g.color[0] === g.color[1],
      pattern: pa, patternName: PAT_NAME[pa],
      eye: ea, eyeName: EYE_NAME[ea],
      shape: sa, shapeName: SHAPE_NAME[sa],
      horn: hornCount,
      shiny,
    };
  }

  // 図鑑キー（見た目の組み合わせ）
  function dexKey(genome) {
    const p = phenotype(genome);
    return [p.colorAllele, p.pattern, p.eye, p.shape, p.horn, p.shiny ? 'X' : 'n'].join('-');
  }

  // ---- 近交係数 -----------------------------------------------------------
  function inbreedingCoef(momAnc, momId, dadAnc, dadId) {
    const A = new Set([...(momAnc || []), momId]);
    const B = new Set([...(dadAnc || []), dadId]);
    let shared = 0;
    for (const x of A) if (B.has(x)) shared++;
    const denom = Math.max(A.size, B.size);
    return denom ? shared / denom : 0;
  }
  function buildAncestors(momAnc, momId, dadAnc, dadId, cap = 14) {
    const set = [];
    const push = (id) => { if (id != null && !set.includes(id)) set.push(id); };
    push(momId); push(dadId);
    for (const a of (momAnc || [])) push(a);
    for (const a of (dadAnc || [])) push(a);
    return set.slice(0, cap);
  }

  return {
    BATTLE_STATS, QUANT_TRAITS, STAT_LABEL,
    COLOR_NAME, COLOR_HEX, PAT_NAME, EYE_NAME, SHAPE_NAME,
    LOCI_PER_TRAIT, ALLELE_MAX, TRAIT_MAX_SUM,
    rnd, randint, choice, clamp, gauss,
    founderGenome, makeGamete, fertilize,
    breedingValue, phenotype, dexKey, inbreedingCoef, buildAncestors,
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = GN;
