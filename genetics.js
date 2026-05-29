/* ============================================================================
 * GENOMONE - 遺伝エンジン (genetics.js)
 *
 * ガチ育種ゲームの心臓部。ゲノモンは二倍体(diploid)の生き物で、
 *   - 量的形質(QTL): 複数遺伝子座の相加効果で能力値が決まる（ポリジーン）
 *   - 質的形質: メンデル遺伝（優性・不完全優性）で見た目が決まる
 * を持つ。配偶子形成(減数分裂)では各座位からランダムに1アレルを選び、
 * 低確率で突然変異(mutation)が起こる。
 *
 * 重要な設計思想（ガチ要素）:
 *   表現型 P = 遺伝的能力 G + 環境偏差 E + 育成補正 + トレーニング
 *   プレイヤーが見えるのは P。だが子に伝わるのは G(遺伝子)だけ。
 *   → 見た目の強さに釣られず「真の遺伝能力」を見抜く選抜眼が問われる。
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

  const LOCI_PER_TRAIT = 5;   // 1形質あたりの遺伝子座数
  const ALLELE_MAX = 4;       // アレル値 0..4（座位あたり最大8 → 形質最大40）
  const TRAIT_MAX_SUM = LOCI_PER_TRAIT * 2 * ALLELE_MAX; // 40

  const COLOR_ALLELES = ['R', 'B', 'G', 'Y']; // あか・あお・みどり・きいろ
  const COLOR_RANK = { R: 4, B: 3, G: 2, Y: 1 }; // 優性順位（高いほど優性）
  const COLOR_NAME = { R: 'あか', B: 'あお', G: 'みどり', Y: 'きいろ' };
  const COLOR_HEX  = { R: '#ff5d6c', B: '#4d8bff', G: '#3fcf8e', Y: '#ffd23f' };

  // 突然変異率
  const MUT_QUANT = 0.018;  // 量的アレルが±1する確率/アレル
  const MUT_COLOR = 0.010;  // 体色アレルが別色に変わる確率
  const MUT_MENDEL = 0.012; // 模様・ツノアレルが反転する確率

  // ---- ユーティリティ -----------------------------------------------------
  const rnd = () => Math.random();
  const randint = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const choice = (arr) => arr[Math.floor(rnd() * arr.length)];
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  // おおよそ正規分布（Box-Muller）
  function gauss(mean = 0, sd = 1) {
    let u = 0, v = 0;
    while (u === 0) u = rnd();
    while (v === 0) v = rnd();
    return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  // ---- ゲノム生成 ---------------------------------------------------------
  // 創始個体(founder)のゲノム。能力アレルは低め(0..2)に寄せ、
  // 育てる余地（伸びしろ）を残す。
  function founderGenome() {
    const q = {};
    for (const t of QUANT_TRAITS) {
      q[t] = [];
      for (let i = 0; i < LOCI_PER_TRAIT; i++) {
        q[t].push([randint(0, 2), randint(0, 2)]);
      }
    }
    return {
      q,
      color: [choice(COLOR_ALLELES), choice(COLOR_ALLELES)],
      pattern: [choice(['S', 's']), choice(['S', 's'])], // S=しま(優性)
      horn: [choice(['H', 'h']), choice(['H', 'h'])],     // 不完全優性
    };
  }

  // ---- 減数分裂（配偶子形成）+ 突然変異 -----------------------------------
  function makeGamete(genome) {
    const q = {};
    for (const t of QUANT_TRAITS) {
      q[t] = genome.q[t].map((locus) => {
        let a = locus[Math.floor(rnd() * 2)];
        if (rnd() < MUT_QUANT) a = clamp(a + (rnd() < 0.5 ? -1 : 1), 0, ALLELE_MAX);
        return a;
      });
    }
    let color = genome.color[Math.floor(rnd() * 2)];
    if (rnd() < MUT_COLOR) color = choice(COLOR_ALLELES);

    let pattern = genome.pattern[Math.floor(rnd() * 2)];
    if (rnd() < MUT_MENDEL) pattern = pattern === 'S' ? 's' : 'S';

    let horn = genome.horn[Math.floor(rnd() * 2)];
    if (rnd() < MUT_MENDEL) horn = horn === 'H' ? 'h' : 'H';

    return { q, color, pattern, horn };
  }

  // ---- 受精（2配偶子 → 新ゲノム） -----------------------------------------
  function fertilize(g1, g2) {
    const q = {};
    for (const t of QUANT_TRAITS) {
      q[t] = g1.q[t].map((a, i) => [a, g2.q[t][i]]);
    }
    return {
      q,
      color: [g1.color, g2.color],
      pattern: [g1.pattern, g2.pattern],
      horn: [g1.horn, g2.horn],
    };
  }

  // ---- 真の遺伝的能力 G (0..100) ------------------------------------------
  // 育種価そのもの。プレイヤーには直接見えない。
  function breedingValue(genome, trait) {
    const sum = genome.q[trait].reduce((s, l) => s + l[0] + l[1], 0);
    return Math.round((sum / TRAIT_MAX_SUM) * 100);
  }

  // ---- 表現型(見た目) -----------------------------------------------------
  function phenotype(genome) {
    // 体色: 最も優性順位の高いアレル
    const cTop = genome.color[0];
    const cBot = genome.color[1];
    const colorAllele = COLOR_RANK[cTop] >= COLOR_RANK[cBot] ? cTop : cBot;

    // 模様: S が1つでもあればしま
    const striped = genome.pattern.includes('S');

    // ツノ: H の本数で不完全優性
    const hornCount = genome.horn.filter((a) => a === 'H').length;
    const horn = hornCount; // 0=なし,1=小,2=大

    return {
      colorAllele,
      colorName: COLOR_NAME[colorAllele],
      colorHex: COLOR_HEX[colorAllele],
      striped,
      horn,
      // 純系判定（同じアレルのホモ接合か）
      colorHomo: cTop === cBot,
    };
  }

  // ---- 近交係数の近似 -----------------------------------------------------
  // 各個体は祖先IDセット(自分を含まない、最大数代)を持つ。
  // 母と父が共有する祖先の割合からインブリードの強さを出す。
  function inbreedingCoef(momAnc, momId, dadAnc, dadId) {
    const A = new Set([...(momAnc || []), momId]);
    const B = new Set([...(dadAnc || []), dadId]);
    let shared = 0;
    for (const x of A) if (B.has(x)) shared++;
    const denom = Math.max(A.size, B.size);
    return denom ? shared / denom : 0;
  }

  // 子の祖先セットを構築（直近3世代ぶん程度に制限）
  function buildAncestors(momAnc, momId, dadAnc, dadId, cap = 14) {
    const set = [];
    const push = (id) => { if (id != null && !set.includes(id)) set.push(id); };
    push(momId); push(dadId);
    for (const a of (momAnc || [])) push(a);
    for (const a of (dadAnc || [])) push(a);
    return set.slice(0, cap);
  }

  return {
    BATTLE_STATS, QUANT_TRAITS, STAT_LABEL, COLOR_NAME, COLOR_HEX,
    LOCI_PER_TRAIT, ALLELE_MAX, TRAIT_MAX_SUM,
    rnd, randint, choice, clamp, gauss,
    founderGenome, makeGamete, fertilize,
    breedingValue, phenotype, inbreedingCoef, buildAncestors,
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = GN;
