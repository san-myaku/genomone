/* ============================================================================
 * GENOMONE - ゲーム本体 (game.js)
 *
 * ガチ育種選抜たまごっち「ゲノモン」
 *   1. タマゴを孵し、世話してゲノモンを育てる（たまごっち要素）
 *   2. 成体になった♂♀を交配し、メンデル遺伝＋ポリジーンで子に形質が伝わる
 *   3. 限られた飼育枠の中で「真の遺伝能力」が高い個体を選抜し、
 *      世代を重ねて理想のゲノモンを作り上げる（育種要素）
 *
 * 表現型 P = 遺伝的能力 G + 環境偏差 E + 育成補正 + トレーニング
 *   見えるのは P。子に伝わるのは G だけ。これが選抜の難しさであり面白さ。
 * ========================================================================== */

(() => {
  'use strict';

  // ---- 時間スケール -------------------------------------------------------
  const GAME_DAY_MS = 120000;        // 1ゲーム日 = 実時間2分
  const OFFLINE_CAP_DAYS = 2;        // オフライン中の経過上限（放置死の緩和）
  const TICK_MS = 1000;              // 描画更新間隔
  const MAX_SLOTS = 8;               // 飼育枠（選抜のジレンマを生む制限）
  const SAVE_KEY = 'genomone.save.v1';

  // ---- 成長段階 -----------------------------------------------------------
  // ageDays(累積ゲーム日)で判定
  const STAGE = [
    { key: 'egg',      label: 'タマゴ',   min: 0  },
    { key: 'baby',     label: 'ベビー',   min: 1  },
    { key: 'juvenile', label: 'わかもの', min: 3  },
    { key: 'adult',    label: 'せいたい', min: 6  },
    { key: 'elder',    label: 'ろうれい', min: 16 },
  ];
  function stageOf(ageDays) {
    let s = STAGE[0];
    for (const st of STAGE) if (ageDays >= st.min) s = st;
    return s.key;
  }
  const stageLabel = (k) => (STAGE.find((s) => s.key === k) || {}).label || '?';
  const canBreed = (c) => !c.dead && (c.stage === 'adult' || c.stage === 'elder');

  // ---- 名前生成 -----------------------------------------------------------
  const NAME_HEAD = ['ガ', 'ゾ', 'ピ', 'モ', 'ク', 'リ', 'タ', 'ネ', 'ベ', 'ジ', 'ド', 'ラ', 'プ', 'メ'];
  const NAME_TAIL = ['ロン', 'ピィ', 'タン', 'ゴ', 'マル', 'スケ', 'ック', 'リン', 'ザ', 'ぽん', 'ミィ', 'ダス'];
  function genName() {
    return GN.choice(NAME_HEAD) + GN.choice(NAME_TAIL);
  }

  // ---- ゲーム状態 ---------------------------------------------------------
  let state = null;
  let selectedId = null;
  let breedSlot = { mom: null, dad: null };

  function newId() { return state.nextId++; }

  // 個体生成（共通）
  function makeCreature({ genome, parentIds, ancestors, generation, ageDays = 0, inbreeding = 0, adultStart = false }) {
    const env = {};
    for (const t of GN.QUANT_TRAITS) {
      env[t] = GN.gauss(-inbreeding * 18, 6); // 近交弱勢: 環境偏差の平均を下げる
    }
    const c = {
      id: newId(),
      name: genName(),
      genome,
      sex: GN.rnd() < 0.5 ? '♂' : '♀',
      bornAt: Date.now(),
      ageDays,
      stage: stageOf(ageDays),
      // 世話パラメータ
      fullness: 80, mood: 80, cleanliness: 90, health: 100, fatigue: 0,
      lastTick: Date.now(),
      // 遺伝・育成
      env,
      growthBonus: null,            // 成体化時に確定
      train: {},                    // トレーニング加算（非遺伝）
      lifespan: null,               // 成体化時に確定
      careSum: 0, careTime: 0,      // 幼少期の世話品質（育成補正の素）
      inbreeding,
      analyzed: false,              // DNA解析済みか
      // 系譜
      parentIds: parentIds || null,
      ancestors: ancestors || [],
      generation,
      breedCooldownUntil: 0,
      dead: false, deadReason: null,
    };
    for (const t of GN.BATTLE_STATS) c.train[t] = 0;
    if (adultStart) {
      c.ageDays = 7; c.stage = 'adult';
      finalizeGrowth(c); // 中立な育成補正・寿命を確定
    }
    return c;
  }

  // 成体化時: 幼少期の世話品質から育成補正と寿命を確定
  function finalizeGrowth(c) {
    const q = c.careTime > 0 ? c.careSum / c.careTime : 60; // 0..100, 既定60
    c.growthBonus = {};
    for (const t of GN.QUANT_TRAITS) {
      // 世話品質 0..100 → -10..+12 のボーナス（個体差つき）
      c.growthBonus[t] = Math.round(((q - 50) / 50) * 11 + GN.gauss(0, 1.5));
    }
    // 寿命: 22日基準 ± 世話品質 ± 近交弱勢
    c.lifespan = GN.clamp(
      22 + ((q - 60) / 40) * 4 + GN.gauss(0, 1.5) - c.inbreeding * 5,
      17, 30
    );
  }

  // ---- 表現型の表示値 -----------------------------------------------------
  // タマゴ/ベビーは不明(null)。わかもの以降で算出。
  function displayStat(c, trait) {
    if (c.stage === 'egg' || c.stage === 'baby') return null;
    let v = GN.breedingValue(c.genome, trait) + (c.env[trait] || 0);
    if (c.growthBonus) v += c.growthBonus[trait] || 0;
    v += c.train[trait] || 0;
    return GN.clamp(Math.round(v), 0, 200);
  }
  function rating(c) {
    let sum = 0;
    for (const t of GN.BATTLE_STATS) {
      const v = displayStat(c, t);
      if (v == null) return null;
      sum += v;
    }
    return sum;
  }

  // ---- 時間進行（1個体） --------------------------------------------------
  function tickCreature(c, now) {
    if (c.dead) return;
    let elapsed = now - c.lastTick;
    if (elapsed <= 0) { c.lastTick = now; return; }
    // オフライン上限
    elapsed = Math.min(elapsed, OFFLINE_CAP_DAYS * GAME_DAY_MS);
    const d = elapsed / GAME_DAY_MS; // 経過ゲーム日

    const prevStage = c.stage;
    c.ageDays += d;

    // 消耗
    c.fullness = GN.clamp(c.fullness - 42 * d, 0, 100);
    c.mood = GN.clamp(c.mood - 32 * d, 0, 100);
    c.cleanliness = GN.clamp(c.cleanliness - 48 * d, 0, 100);
    c.fatigue = GN.clamp(c.fatigue - 25 * d, 0, 100);

    // 健康: 欠乏で減少、好調で自然回復
    let deficit = 0;
    if (c.fullness < 20) deficit += (20 - c.fullness);
    if (c.mood < 20) deficit += (20 - c.mood);
    if (c.cleanliness < 20) deficit += (20 - c.cleanliness);
    if (deficit > 0) {
      c.health = GN.clamp(c.health - deficit * 0.5 * d, 0, 100);
    } else if (c.fullness > 60 && c.mood > 50 && c.cleanliness > 50) {
      c.health = GN.clamp(c.health + 9 * d, 0, 100);
    }

    // 幼少期の世話品質を記録
    if (c.stage === 'baby' || c.stage === 'juvenile') {
      const quality = (c.fullness + c.mood + c.cleanliness + c.health) / 4;
      c.careSum += quality * d;
      c.careTime += d;
    }

    // 段階更新
    c.stage = stageOf(c.ageDays);
    if (prevStage !== c.stage) {
      if (c.stage === 'baby') log(`🥚 「${c.name}」がタマゴから孵った！`);
      if (c.stage === 'juvenile') log(`🐣 「${c.name}」が わかもの に成長。能力が見え始めた。`);
      if (c.stage === 'adult') {
        if (!c.growthBonus) finalizeGrowth(c);
        log(`✨ 「${c.name}」が せいたい に！交配が可能になった（${c.sex}）。`);
      }
      if (c.stage === 'elder') log(`🌙 「${c.name}」は ろうれい 期に入った。`);
    }

    // 死亡判定
    if (c.health <= 0) {
      c.dead = true; c.deadReason = 'びょうき';
      log(`💀 「${c.name}」は 病気 で天に召された…世話を怠ってはいけない。`);
    } else if (c.lifespan && c.ageDays >= c.lifespan) {
      c.dead = true; c.deadReason = 'じゅみょう';
      log(`🕊️ 「${c.name}」は 寿命 を全うした（評価値 最高${c.bestRating || rating(c) || '—'}）。`);
    }

    c.lastTick = now;
  }

  function tickAll() {
    const now = Date.now();
    for (const c of state.roster) {
      tickCreature(c, now);
      const r = rating(c);
      if (r != null) {
        c.bestRating = Math.max(c.bestRating || 0, r);
        if (r > (state.bestRatingEver || 0)) {
          state.bestRatingEver = r;
          state.bestRatingName = c.name;
        }
      }
    }
  }

  // ---- アクション ---------------------------------------------------------
  function feed(c) {
    if (c.dead || c.stage === 'egg') return;
    if (c.fullness >= 98) { // 過食
      c.health = GN.clamp(c.health - 8, 0, 100);
      c.mood = GN.clamp(c.mood - 6, 0, 100);
      log(`🍖 「${c.name}」は満腹すぎて気持ち悪そうだ…（肥満注意）`);
    } else {
      c.fullness = GN.clamp(c.fullness + 35, 0, 100);
      c.mood = GN.clamp(c.mood + 4, 0, 100);
    }
  }
  function play(c) {
    if (c.dead || c.stage === 'egg') return;
    c.mood = GN.clamp(c.mood + 28, 0, 100);
    c.fullness = GN.clamp(c.fullness - 6, 0, 100);
    c.fatigue = GN.clamp(c.fatigue + 14, 0, 100);
  }
  function clean(c) {
    if (c.dead) return;
    c.cleanliness = 100;
  }
  function rest(c) {
    if (c.dead || c.stage === 'egg') return;
    c.health = GN.clamp(c.health + 18, 0, 100);
    c.fatigue = GN.clamp(c.fatigue - 45, 0, 100);
    c.mood = GN.clamp(c.mood + 4, 0, 100);
  }
  function medicine(c) {
    if (c.dead || c.stage === 'egg') return;
    if (c.health >= 80) { log(`💊 「${c.name}」は元気そのもの。くすりは不要だ。`); return; }
    c.health = GN.clamp(c.health + 40, 0, 100);
    c.mood = GN.clamp(c.mood - 5, 0, 100);
    log(`💊 「${c.name}」にくすりを与えた。`);
  }
  function train(c, trait) {
    if (c.dead || c.stage === 'egg' || c.stage === 'baby') {
      log('まだトレーニングできる段階ではない（わかもの以降）。'); return;
    }
    if (c.fatigue > 75) { log(`「${c.name}」は疲れている。やすませよう。`); return; }
    if (c.fullness < 20) { log(`「${c.name}」は空腹でトレーニングできない。`); return; }
    const cap = 28; // トレーニング上限（非遺伝の後天能力）
    if ((c.train[trait] || 0) >= cap) { log(`${GN.STAT_LABEL[trait]}はこれ以上トレーニングで伸びない（遺伝の壁）。`); return; }
    const gain = Math.min(GN.randint(2, 5), cap - c.train[trait]);
    c.train[trait] += gain;
    c.fatigue = GN.clamp(c.fatigue + 22, 0, 100);
    c.fullness = GN.clamp(c.fullness - 10, 0, 100);
    c.mood = GN.clamp(c.mood - 8, 0, 100);
    log(`🏋️ 「${c.name}」の ${GN.STAT_LABEL[trait]} が +${gain}（後天）。`);
  }
  function analyze(c) {
    c.analyzed = true;
    log(`🔬 「${c.name}」のDNA解析完了。真の育種価(G)が見えるようになった。`);
  }
  function release(c) {
    const idx = state.roster.findIndex((x) => x.id === c.id);
    if (idx >= 0) state.roster.splice(idx, 1);
    if (selectedId === c.id) selectedId = state.roster[0] ? state.roster[0].id : null;
    if (breedSlot.mom === c.id) breedSlot.mom = null;
    if (breedSlot.dad === c.id) breedSlot.dad = null;
    log(`👋 「${c.name}」を野に還した。`);
  }

  // ---- 交配 ---------------------------------------------------------------
  function breed() {
    const mom = state.roster.find((c) => c.id === breedSlot.mom);
    const dad = state.roster.find((c) => c.id === breedSlot.dad);
    if (!mom || !dad) { log('交配には♀と♂を1体ずつ選んでね。'); return; }
    if (mom.sex === dad.sex) { log('交配には♀と♂のペアが必要だ。'); return; }
    if (!canBreed(mom) || !canBreed(dad)) { log('成体(またはろうれい)同士でないと交配できない。'); return; }
    const now = Date.now();
    if (mom.breedCooldownUntil > now || dad.breedCooldownUntil > now) {
      log('交配したばかりだ。少し休ませよう。'); return;
    }
    if (mom.health < 40 || dad.health < 40) { log('健康状態が悪いと交配できない（health 40以上必要）。'); return; }

    const free = MAX_SLOTS - state.roster.length;
    if (free <= 0) { log(`飼育枠が満杯(${MAX_SLOTS})。だれかを にがして 枠を空けよう。`); return; }

    // 産卵数: 親の健康・きげん + ろうれいは減少
    let eggs = 1 + (mom.health + mom.mood > 140 ? 1 : 0) + (GN.rnd() < 0.35 ? 1 : 0);
    if (mom.stage === 'elder' || dad.stage === 'elder') eggs = Math.max(1, eggs - 1);
    eggs = Math.min(eggs, free, 3);

    const coef = GN.inbreedingCoef(mom.ancestors, mom.id, dad.ancestors, dad.id);
    const gen = Math.max(mom.generation, dad.generation) + 1;
    const anc = GN.buildAncestors(mom.ancestors, mom.id, dad.ancestors, dad.id);

    for (let i = 0; i < eggs; i++) {
      const child = makeCreature({
        genome: GN.fertilize(GN.makeGamete(mom.genome), GN.makeGamete(dad.genome)),
        parentIds: [mom.id, dad.id],
        ancestors: anc,
        generation: gen,
        inbreeding: coef,
      });
      state.roster.push(child);
    }
    state.maxGeneration = Math.max(state.maxGeneration, gen);

    // 親への負担
    mom.breedCooldownUntil = now + GAME_DAY_MS * 1.5;
    dad.breedCooldownUntil = now + GAME_DAY_MS * 1.5;
    mom.mood = GN.clamp(mom.mood - 12, 0, 100);
    mom.fullness = GN.clamp(mom.fullness - 18, 0, 100);
    dad.mood = GN.clamp(dad.mood - 8, 0, 100);

    let msg = `🥚 「${mom.name}」×「${dad.name}」から ${eggs}個のタマゴ！(第${gen}世代)`;
    if (coef > 0.25) msg += ` ⚠️近親交配(係数${coef.toFixed(2)})…弱い子が生まれやすい`;
    else if (coef > 0.05) msg += ` (近交係数${coef.toFixed(2)})`;
    log(msg);
    breedSlot = { mom: null, dad: null };
  }

  // ---- ログ ---------------------------------------------------------------
  function log(msg) {
    state.log.unshift({ t: Date.now(), msg });
    if (state.log.length > 60) state.log.pop();
  }

  // ---- セーブ/ロード ------------------------------------------------------
  function save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) {}
  }
  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      state = JSON.parse(raw);
      // オフライン経過を反映
      tickAll();
      return true;
    } catch (e) { return false; }
  }
  function freshGame() {
    state = {
      nextId: 1,
      roster: [],
      log: [],
      maxGeneration: 1,
      bestRatingEver: 0,
      bestRatingName: '',
      startedAt: Date.now(),
    };
    // 創始個体: 成体2♂2♀（すぐ交配できるよう成体スタート）
    const sexes = ['♀', '♂', '♀', '♂'];
    for (let i = 0; i < 4; i++) {
      const c = makeCreature({ genome: GN.founderGenome(), generation: 1, adultStart: true });
      c.sex = sexes[i];
      c.name = '創始' + genName();
      state.roster.push(c);
    }
    selectedId = state.roster[0].id;
    log('🧬 ようこそ「ゲノモン」へ。創始個体4体から、最強の血統を育てよう。');
    log('💡 見えるのは表現型(P)。子に伝わるのは遺伝(G)だけ。選抜眼が試される。');
    save();
  }

  // =========================================================================
  // 描画
  // =========================================================================
  const $ = (sel) => document.querySelector(sel);

  // ゲノモンの見た目をSVGで生成
  function drawGenomon(c, size = 160) {
    if (c.dead) {
      return `<svg viewBox="0 0 100 100" width="${size}" height="${size}">
        <text x="50" y="55" font-size="46" text-anchor="middle">👻</text>
        <text x="50" y="86" font-size="11" text-anchor="middle" fill="#888">${c.deadReason || ''}</text>
      </svg>`;
    }
    const ph = GN.phenotype(c.genome);
    if (c.stage === 'egg') {
      return `<svg viewBox="0 0 100 100" width="${size}" height="${size}">
        <ellipse cx="50" cy="58" rx="26" ry="33" fill="${ph.colorHex}" stroke="#0003" stroke-width="2"/>
        <ellipse cx="42" cy="46" rx="7" ry="10" fill="#fff6" />
        ${ph.striped ? '<path d="M30 50 q20 8 40 0 M28 64 q22 8 44 0" stroke="#0002" stroke-width="3" fill="none"/>' : ''}
      </svg>`;
    }
    // 体格 → スケール
    const szStat = displayStat(c, 'size');
    const bodyScale = 0.7 + (szStat != null ? szStat : 40) / 200 * 0.7; // 0.7..1.4
    const stageScale = { baby: 0.7, juvenile: 0.85, adult: 1, elder: 0.95 }[c.stage] || 1;
    const s = bodyScale * stageScale;
    const cx = 50, cy = 56;
    const rx = 28 * s, ry = 26 * s;

    // ツノ
    let horns = '';
    if (ph.horn === 1) {
      horns = `<polygon points="${cx-6},${cy-ry} ${cx-1},${cy-ry-10} ${cx+4},${cy-ry}" fill="#e8e0c8" stroke="#0003"/>`;
    } else if (ph.horn === 2) {
      horns = `<polygon points="${cx-15},${cy-ry+4} ${cx-11},${cy-ry-14} ${cx-6},${cy-ry+2}" fill="#e8e0c8" stroke="#0003"/>
               <polygon points="${cx+6},${cy-ry+2} ${cx+11},${cy-ry-14} ${cx+15},${cy-ry+4}" fill="#e8e0c8" stroke="#0003"/>`;
    }
    // 模様
    let stripes = '';
    if (ph.striped) {
      stripes = `<g clip-path="url(#bdy${c.id})" opacity="0.22">
        <rect x="${cx-rx}" y="${cy-12}" width="${rx*2}" height="6" fill="#000"/>
        <rect x="${cx-rx}" y="${cy+2}" width="${rx*2}" height="6" fill="#000"/>
        <rect x="${cx-rx}" y="${cy+16}" width="${rx*2}" height="6" fill="#000"/>
      </g>`;
    }
    // 表情（健康・きげん）
    const happy = c.mood > 50 && c.health > 40;
    const sick = c.health < 35;
    const mouth = sick
      ? `<path d="M${cx-7} ${cy+12} q7 -6 14 0" stroke="#0007" stroke-width="2" fill="none"/>`
      : happy
        ? `<path d="M${cx-7} ${cy+10} q7 7 14 0" stroke="#0007" stroke-width="2" fill="none"/>`
        : `<line x1="${cx-6}" y1="${cy+12}" x2="${cx+6}" y2="${cy+12}" stroke="#0007" stroke-width="2"/>`;
    const eyeY = cy - 2;
    const eyes = sick
      ? `<text x="${cx-9}" y="${eyeY+4}" font-size="11">＞</text><text x="${cx+3}" y="${eyeY+4}" font-size="11">＜</text>`
      : `<circle cx="${cx-9}" cy="${eyeY}" r="4" fill="#222"/><circle cx="${cx+9}" cy="${eyeY}" r="4" fill="#222"/>
         <circle cx="${cx-7.5}" cy="${eyeY-1.5}" r="1.4" fill="#fff"/><circle cx="${cx+10.5}" cy="${eyeY-1.5}" r="1.4" fill="#fff"/>`;

    return `<svg viewBox="0 0 100 100" width="${size}" height="${size}">
      <defs><clipPath id="bdy${c.id}"><ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"/></clipPath></defs>
      ${horns}
      <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${ph.colorHex}" stroke="#0004" stroke-width="2"/>
      ${stripes}
      <ellipse cx="${cx-rx*0.45}" cy="${cy-ry*0.5}" rx="${rx*0.28}" ry="${ry*0.32}" fill="#fff5"/>
      ${eyes}
      ${mouth}
      <ellipse cx="${cx}" cy="${cy+ry-2}" rx="${rx*0.85}" ry="4" fill="#0001"/>
    </svg>`;
  }

  function meter(label, val, cls) {
    const v = Math.round(val);
    return `<div class="meter">
      <span class="meter-label">${label}</span>
      <div class="meter-bar"><div class="meter-fill ${cls}" style="width:${v}%"></div></div>
      <span class="meter-val">${v}</span>
    </div>`;
  }

  function statBar(c, trait) {
    const v = displayStat(c, trait);
    const label = GN.STAT_LABEL[trait];
    if (v == null) {
      return `<div class="stat"><span class="stat-l">${label}</span>
        <div class="stat-bar"><div class="stat-fill" style="width:0%"></div></div>
        <span class="stat-v">???</span></div>`;
    }
    const pct = Math.min(100, v / 200 * 100);
    let extra = '';
    if (c.analyzed) {
      const g = GN.breedingValue(c.genome, trait);
      extra = `<span class="stat-g" title="真の育種価(遺伝)">G${g}</span>`;
    }
    const tr = c.train[trait] ? `<span class="stat-t" title="トレーニング(非遺伝)">+${c.train[trait]}</span>` : '';
    return `<div class="stat"><span class="stat-l">${label}</span>
      <div class="stat-bar"><div class="stat-fill" style="width:${pct}%"></div></div>
      <span class="stat-v">${v}</span>${tr}${extra}</div>`;
  }

  function renderSelected() {
    const c = state.roster.find((x) => x.id === selectedId);
    const box = $('#selected');
    if (!c) { box.innerHTML = '<div class="empty">個体を選択してください</div>'; return; }

    const r = rating(c);
    const parents = c.parentIds
      ? c.parentIds.map((id) => {
          const p = state.roster.find((x) => x.id === id);
          return p ? p.name : `#${id}(不在)`;
        }).join(' × ')
      : 'なし（創始個体）';

    const battle = GN.BATTLE_STATS.map((t) => statBar(c, t)).join('');

    const careDisabled = c.dead || c.stage === 'egg';
    const trainBtns = GN.BATTLE_STATS.map((t) =>
      `<button class="mini" data-train="${t}" ${careDisabled ? 'disabled' : ''}>${GN.STAT_LABEL[t]}↑</button>`
    ).join('');

    box.innerHTML = `
      <div class="sel-top">
        <div class="sel-art">${drawGenomon(c, 170)}</div>
        <div class="sel-info">
          <div class="sel-name">${c.name} <span class="sex ${c.sex === '♀' ? 'f' : 'm'}">${c.sex}</span></div>
          <div class="sel-tags">
            <span class="tag">${stageLabel(c.stage)}</span>
            <span class="tag">第${c.generation}世代</span>
            <span class="tag">${c.ageDays.toFixed(1)}日齢</span>
            ${c.dead ? `<span class="tag dead">死亡(${c.deadReason})</span>` : ''}
          </div>
          <div class="sel-pheno">
            体色:${GN.phenotype(c.genome).colorName}${GN.phenotype(c.genome).colorHomo ? '(純系)' : ''} /
            ${GN.phenotype(c.genome).striped ? 'しま模様' : 'むじ'} /
            ツノ:${['なし', '小', '大'][GN.phenotype(c.genome).horn]}
          </div>
          <div class="sel-rating">評価値 <b>${r != null ? r : '—'}</b> ${c.bestRating ? `<small>(最高${c.bestRating})</small>` : ''}</div>
          <div class="sel-ped">血統: ${parents}${c.inbreeding > 0.05 ? ` / 近交係数 ${c.inbreeding.toFixed(2)}` : ''}</div>
        </div>
      </div>

      <div class="care">
        ${meter('まんぷく', c.fullness, 'm-food')}
        ${meter('きげん', c.mood, 'm-mood')}
        ${meter('せいけつ', c.cleanliness, 'm-clean')}
        ${meter('けんこう', c.health, 'm-health')}
        ${meter('ひろう', c.fatigue, 'm-fatigue')}
      </div>

      <div class="actions">
        <button data-act="feed"  ${careDisabled ? 'disabled' : ''}>🍖 ごはん</button>
        <button data-act="play"  ${careDisabled ? 'disabled' : ''}>🎾 あそぶ</button>
        <button data-act="clean" ${c.dead ? 'disabled' : ''}>🧹 そうじ</button>
        <button data-act="rest"  ${careDisabled ? 'disabled' : ''}>😴 やすむ</button>
        <button data-act="med"   ${careDisabled ? 'disabled' : ''}>💊 くすり</button>
      </div>

      <div class="stats">
        <div class="stats-head">能力（表現型 P）${c.analyzed ? '<span class="g-on">／ G=遺伝</span>' : ''}</div>
        ${battle}
      </div>

      <div class="train-row">
        <span class="train-label">🏋️ トレーニング:</span> ${trainBtns}
        <button class="mini analyze" data-act="analyze" ${c.dead ? 'disabled' : ''} ${c.analyzed ? 'disabled' : ''}>🔬 DNA解析</button>
      </div>

      <div class="sel-bottom">
        ${canBreed(c) ? `<button class="breed-pick" data-pick="${c.sex === '♀' ? 'mom' : 'dad'}">この個体を交配に${c.sex === '♀' ? '♀' : '♂'}選択</button>` : ''}
        <button class="danger" data-act="release">👋 にがす（選抜）</button>
      </div>
    `;
  }

  function renderRoster() {
    const grid = $('#roster');
    let html = '';
    for (const c of state.roster) {
      const r = rating(c);
      const sel = c.id === selectedId ? 'sel' : '';
      const dead = c.dead ? 'dead' : '';
      const inBreed = (breedSlot.mom === c.id || breedSlot.dad === c.id) ? 'breed' : '';
      html += `
        <div class="card ${sel} ${dead} ${inBreed}" data-id="${c.id}">
          <div class="card-art">${drawGenomon(c, 72)}</div>
          <div class="card-name">${c.name} <span class="sex ${c.sex === '♀' ? 'f' : 'm'}">${c.sex}</span></div>
          <div class="card-sub">${stageLabel(c.stage)}・G${c.generation}</div>
          <div class="card-rate">${r != null ? '評' + r : '???'}</div>
          ${inBreed ? `<div class="card-flag">${breedSlot.mom === c.id ? '♀選択' : '♂選択'}</div>` : ''}
        </div>`;
    }
    for (let i = state.roster.length; i < MAX_SLOTS; i++) {
      html += '<div class="card empty-slot">空き枠</div>';
    }
    grid.innerHTML = html;
  }

  function renderBreed() {
    const mom = state.roster.find((c) => c.id === breedSlot.mom);
    const dad = state.roster.find((c) => c.id === breedSlot.dad);
    $('#breed-mom').textContent = mom ? `♀ ${mom.name}` : '♀ 未選択';
    $('#breed-dad').textContent = dad ? `♂ ${dad.name}` : '♂ 未選択';
    let coefTxt = '';
    if (mom && dad) {
      const coef = GN.inbreedingCoef(mom.ancestors, mom.id, dad.ancestors, dad.id);
      if (coef > 0.05) coefTxt = ` 近交係数 ${coef.toFixed(2)}${coef > 0.25 ? ' ⚠️' : ''}`;
    }
    $('#breed-info').textContent = coefTxt;
  }

  function renderHeader() {
    $('#stat-gen').textContent = state.maxGeneration;
    $('#stat-best').textContent = state.bestRatingEver + (state.bestRatingName ? `（${state.bestRatingName}）` : '');
    $('#stat-slots').textContent = `${state.roster.length}/${MAX_SLOTS}`;
  }

  function renderLog() {
    const el = $('#log');
    el.innerHTML = state.log.map((e) => `<div class="log-line">${e.msg}</div>`).join('');
  }

  function renderAll() {
    renderHeader();
    renderSelected();
    renderRoster();
    renderBreed();
    renderLog();
  }

  // =========================================================================
  // イベント
  // =========================================================================
  function selected() { return state.roster.find((x) => x.id === selectedId); }

  function bindEvents() {
    // ロスター選択
    $('#roster').addEventListener('click', (e) => {
      const card = e.target.closest('.card[data-id]');
      if (!card) return;
      selectedId = Number(card.dataset.id);
      renderAll();
    });

    // セレクト内のアクション（委譲）
    $('#selected').addEventListener('click', (e) => {
      const c = selected();
      if (!c) return;
      const btn = e.target.closest('button');
      if (!btn) return;

      if (btn.dataset.act) {
        switch (btn.dataset.act) {
          case 'feed': feed(c); break;
          case 'play': play(c); break;
          case 'clean': clean(c); break;
          case 'rest': rest(c); break;
          case 'med': medicine(c); break;
          case 'analyze': analyze(c); break;
          case 'release':
            if (confirm(`「${c.name}」を にがしますか？（取り消せません）`)) release(c);
            break;
        }
      } else if (btn.dataset.train) {
        train(c, btn.dataset.train);
      } else if (btn.dataset.pick) {
        breedSlot[btn.dataset.pick] = c.id;
        log(`交配${btn.dataset.pick === 'mom' ? '♀' : '♂'}に「${c.name}」をセット。`);
      }
      save();
      renderAll();
    });

    $('#btn-breed').addEventListener('click', () => { breed(); save(); renderAll(); });
    $('#btn-clear-breed').addEventListener('click', () => { breedSlot = { mom: null, dad: null }; renderAll(); });

    $('#btn-reset').addEventListener('click', () => {
      if (confirm('全データを消して最初からやり直しますか？')) { freshGame(); renderAll(); }
    });

    $('#btn-help').addEventListener('click', () => {
      $('#help').classList.toggle('open');
    });
    $('#help').addEventListener('click', (e) => {
      if (e.target.id === 'help' || e.target.classList.contains('help-close')) $('#help').classList.remove('open');
    });
  }

  // =========================================================================
  // 起動
  // =========================================================================
  function start() {
    if (!load()) freshGame();
    if (!selectedId && state.roster[0]) selectedId = state.roster[0].id;
    bindEvents();
    renderAll();
    // メインループ
    setInterval(() => {
      tickAll();
      save();
      renderAll();
    }, TICK_MS);
  }

  document.addEventListener('DOMContentLoaded', start);
})();
