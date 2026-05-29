/* ============================================================================
 * GENOMONE - ゲーム本体 (game.js)
 *
 * ガチ育種選抜たまごっち「ゲノモン」
 *   1. タマゴを孵し、世話してゲノモンを育てる（たまごっち）
 *   2. 成体の♀×♂を交配し、メンデル遺伝＋ポリジーンで子に形質が伝わる（育種）
 *   3. 飼育枠8体の制限の中、優れた個体を選抜し世代を重ねる（選抜）
 *
 * 表現型 P = 遺伝G + 環境E + 育成補正 + トレーニング。見えるのはP、伝わるのはG。
 * ========================================================================== */
(() => {
  'use strict';

  // ---- 設定 ---------------------------------------------------------------
  const GAME_DAY_MS = 120000;     // 1ゲーム日 = 実2分
  const OFFLINE_CAP_DAYS = 2;
  const TICK_MS = 1000;
  const MAX_SLOTS = 8;
  const SAVE_KEY = 'genomone.save.v2';
  const HERO_SIZE = 210;

  const STAGE = [
    { key: 'egg', label: 'タマゴ', min: 0 },
    { key: 'baby', label: 'ベビー', min: 1 },
    { key: 'juvenile', label: 'わかもの', min: 3 },
    { key: 'adult', label: 'せいたい', min: 6 },
    { key: 'elder', label: 'ろうれい', min: 16 },
  ];
  function stageOf(a) { let s = STAGE[0]; for (const st of STAGE) if (a >= st.min) s = st; return s.key; }
  const stageLabel = (k) => (STAGE.find((s) => s.key === k) || {}).label || '?';
  const canBreed = (c) => !c.dead && (c.stage === 'adult' || c.stage === 'elder');

  const NAME_HEAD = ['ガ', 'ゾ', 'ピ', 'モ', 'ク', 'リ', 'タ', 'ネ', 'ベ', 'ジ', 'ド', 'ラ', 'プ', 'メ', 'ニ', 'ふ', 'ぽ', 'ち'];
  const NAME_TAIL = ['ロン', 'ピィ', 'たん', 'ゴ', 'まる', 'すけ', 'ック', 'りん', 'ザ', 'ぽん', 'ミィ', 'ダス', 'ちゃ', 'のす'];
  const genName = () => GN.choice(NAME_HEAD) + GN.choice(NAME_TAIL);

  // ---- 状態 ---------------------------------------------------------------
  let state = null;
  let selectedId = null;
  let breedSlot = { mom: null, dad: null };
  let heroSig = '';
  let rosterSig = '';
  let fxQueue = [];

  const newId = () => state.nextId++;

  function makeCreature(o) {
    const env = {};
    const inb = o.inbreeding || 0;
    for (const t of GN.QUANT_TRAITS) env[t] = GN.gauss(-inb * 18, 6);
    const c = {
      id: newId(), name: genName(), genome: o.genome,
      sex: o.sex || (GN.rnd() < 0.5 ? '♂' : '♀'),
      bornAt: Date.now(), ageDays: o.ageDays || 0, stage: stageOf(o.ageDays || 0),
      fullness: 82, mood: 82, cleanliness: 92, health: 100, fatigue: 0,
      lastTick: Date.now(),
      env, growthBonus: null, train: {}, lifespan: null,
      careSum: 0, careTime: 0, inbreeding: inb, analyzed: false,
      parentIds: o.parentIds || null, ancestors: o.ancestors || [],
      generation: o.generation, breedCooldownUntil: 0,
      dead: false, deadReason: null, bestRating: 0, _react: null,
    };
    for (const t of GN.BATTLE_STATS) c.train[t] = 0;
    if (o.adultStart) { c.ageDays = 7; c.stage = 'adult'; finalizeGrowth(c); }
    recordDex(c, o.silent);
    return c;
  }

  function finalizeGrowth(c) {
    const q = c.careTime > 0 ? c.careSum / c.careTime : 62;
    c.growthBonus = {};
    for (const t of GN.QUANT_TRAITS) c.growthBonus[t] = Math.round(((q - 50) / 50) * 11 + GN.gauss(0, 1.5));
    c.lifespan = GN.clamp(22 + ((q - 60) / 40) * 4 + GN.gauss(0, 1.5) - c.inbreeding * 5, 17, 30);
  }

  function displayStat(c, t) {
    if (c.stage === 'egg' || c.stage === 'baby') return null;
    let v = GN.breedingValue(c.genome, t) + (c.env[t] || 0);
    if (c.growthBonus) v += c.growthBonus[t] || 0;
    v += c.train[t] || 0;
    return GN.clamp(Math.round(v), 0, 200);
  }
  function rating(c) {
    let s = 0;
    for (const t of GN.BATTLE_STATS) { const v = displayStat(c, t); if (v == null) return null; s += v; }
    return s;
  }

  // ---- 時間進行 -----------------------------------------------------------
  function tickCreature(c, now) {
    if (c.dead) return;
    let el = now - c.lastTick;
    if (el <= 0) { c.lastTick = now; return; }
    el = Math.min(el, OFFLINE_CAP_DAYS * GAME_DAY_MS);
    const d = el / GAME_DAY_MS;
    const prev = c.stage;
    c.ageDays += d;
    c.fullness = GN.clamp(c.fullness - 42 * d, 0, 100);
    c.mood = GN.clamp(c.mood - 32 * d, 0, 100);
    c.cleanliness = GN.clamp(c.cleanliness - 48 * d, 0, 100);
    c.fatigue = GN.clamp(c.fatigue - 25 * d, 0, 100);
    let def = 0;
    if (c.fullness < 20) def += 20 - c.fullness;
    if (c.mood < 20) def += 20 - c.mood;
    if (c.cleanliness < 20) def += 20 - c.cleanliness;
    if (def > 0) c.health = GN.clamp(c.health - def * 0.5 * d, 0, 100);
    else if (c.fullness > 60 && c.mood > 50 && c.cleanliness > 50) c.health = GN.clamp(c.health + 9 * d, 0, 100);
    if (c.stage === 'baby' || c.stage === 'juvenile') {
      c.careSum += ((c.fullness + c.mood + c.cleanliness + c.health) / 4) * d; c.careTime += d;
    }
    c.stage = stageOf(c.ageDays);
    if (prev !== c.stage) {
      if (c.stage === 'baby') { log(`🥚➡🐣 「${c.name}」が孵った！`); fxQueue.push({ t: 'hatch', id: c.id }); }
      if (c.stage === 'juvenile') log(`🐣 「${c.name}」が わかもの に成長。能力が見え始めた。`);
      if (c.stage === 'adult') { if (!c.growthBonus) finalizeGrowth(c); log(`✨ 「${c.name}」が せいたい に！交配OK（${c.sex}）`); fxQueue.push({ t: 'adult', id: c.id }); }
      if (c.stage === 'elder') log(`🌙 「${c.name}」は ろうれい 期へ。`);
    }
    if (c.health <= 0) { c.dead = true; c.deadReason = 'びょうき'; onDeath(c); }
    else if (c.lifespan && c.ageDays >= c.lifespan) { c.dead = true; c.deadReason = 'じゅみょう'; onDeath(c); }
    c.lastTick = now;
  }
  function onDeath(c) {
    log(`🕊️ 「${c.name}」は ${c.deadReason} で天に召された…（最高評価 ${c.bestRating || '—'}）`);
    fxQueue.push({ t: 'death', id: c.id });
    considerHall(c);
  }

  function tickAll() {
    const now = Date.now();
    for (const c of state.roster) {
      tickCreature(c, now);
      const r = rating(c);
      if (r != null) {
        if (r > (c.bestRating || 0)) c.bestRating = r;
        if (r > (state.bestRatingEver || 0)) {
          const beat = state.bestRatingEver > 0;
          state.bestRatingEver = r; state.bestRatingName = c.name;
          if (beat) fxQueue.push({ t: 'record', id: c.id, r });
        }
      }
    }
    checkAchievements();
  }

  // ---- アクション ---------------------------------------------------------
  function act(c, type) {
    if (!c) return;
    let ok = true;
    switch (type) {
      case 'feed':
        if (c.dead || c.stage === 'egg') return;
        if (c.fullness >= 98) { c.health = GN.clamp(c.health - 8, 0, 100); c.mood = GN.clamp(c.mood - 6, 0, 100); toast('🍖 満腹すぎる…肥満注意！'); }
        else { c.fullness = GN.clamp(c.fullness + 35, 0, 100); c.mood = GN.clamp(c.mood + 4, 0, 100); }
        break;
      case 'play':
        if (c.dead || c.stage === 'egg') return;
        c.mood = GN.clamp(c.mood + 28, 0, 100); c.fullness = GN.clamp(c.fullness - 6, 0, 100); c.fatigue = GN.clamp(c.fatigue + 14, 0, 100);
        break;
      case 'clean':
        if (c.dead) return; c.cleanliness = 100; break;
      case 'rest':
        if (c.dead || c.stage === 'egg') return;
        c.health = GN.clamp(c.health + 18, 0, 100); c.fatigue = GN.clamp(c.fatigue - 45, 0, 100); c.mood = GN.clamp(c.mood + 4, 0, 100);
        c._react = 'sleep'; setTimeout(() => { c._react = null; }, 1400); break;
      case 'med':
        if (c.dead || c.stage === 'egg') return;
        if (c.health >= 80) { toast('💊 元気いっぱい！くすりは不要'); ok = false; break; }
        c.health = GN.clamp(c.health + 40, 0, 100); c.mood = GN.clamp(c.mood - 5, 0, 100); break;
      case 'pet':
        if (c.dead || c.stage === 'egg') return;
        c.mood = GN.clamp(c.mood + 6, 0, 100); break;
    }
    if (ok) { GMAudio.play(type === 'pet' ? 'pet' : type); reactHero(type, c); }
  }

  function train(c, t) {
    if (!c || c.dead || c.stage === 'egg' || c.stage === 'baby') { toast('まだトレーニングできない（わかもの〜）'); return; }
    if (c.fatigue > 75) { toast('つかれてる…やすませよう'); GMAudio.play('bad'); return; }
    if (c.fullness < 20) { toast('おなかがすいてできない'); GMAudio.play('bad'); return; }
    const cap = 28;
    if ((c.train[t] || 0) >= cap) { toast(`${GN.STAT_LABEL[t]}はもう伸びない（遺伝の壁）`); GMAudio.play('bad'); return; }
    const g = Math.min(GN.randint(2, 5), cap - c.train[t]);
    c.train[t] += g; c.fatigue = GN.clamp(c.fatigue + 22, 0, 100); c.fullness = GN.clamp(c.fullness - 10, 0, 100); c.mood = GN.clamp(c.mood - 8, 0, 100);
    log(`🏋️ 「${c.name}」の ${GN.STAT_LABEL[t]} +${g}（後天・非遺伝）`);
    GMAudio.play('train'); reactHero('train', c);
  }

  function analyze(c) {
    if (!c || c.analyzed) return;
    c.analyzed = true;
    toast('🔬 DNA解析完了！真の育種価Gが見えるように'); GMAudio.play('med');
    log(`🔬 「${c.name}」を解析。能力バーに G=遺伝 を表示。`);
  }

  function releaseCreature(c) {
    considerHall(c);
    const i = state.roster.findIndex((x) => x.id === c.id);
    if (i >= 0) state.roster.splice(i, 1);
    if (selectedId === c.id) selectedId = state.roster[0] ? state.roster[0].id : null;
    if (breedSlot.mom === c.id) breedSlot.mom = null;
    if (breedSlot.dad === c.id) breedSlot.dad = null;
    log(`👋 「${c.name}」を野に還した。`);
  }

  // ---- 交配 ---------------------------------------------------------------
  function breed() {
    const mom = state.roster.find((c) => c.id === breedSlot.mom);
    const dad = state.roster.find((c) => c.id === breedSlot.dad);
    if (!mom || !dad) { toast('♀と♂を1体ずつ選んでね'); return; }
    if (mom.sex === dad.sex) { toast('♀×♂のペアが必要'); return; }
    if (!canBreed(mom) || !canBreed(dad)) { toast('成体（orろうれい）同士で交配できる'); return; }
    const now = Date.now();
    if (mom.breedCooldownUntil > now || dad.breedCooldownUntil > now) { toast('交配したばかり。休ませよう'); return; }
    if (mom.health < 40 || dad.health < 40) { toast('健康が悪いと交配できない（40以上）'); GMAudio.play('bad'); return; }
    const free = MAX_SLOTS - state.roster.length;
    if (free <= 0) { toast(`枠が満杯(${MAX_SLOTS})。だれかを にがそう`); GMAudio.play('bad'); return; }

    let eggs = 1 + (mom.health + mom.mood > 140 ? 1 : 0) + (GN.rnd() < 0.35 ? 1 : 0);
    if (mom.stage === 'elder' || dad.stage === 'elder') eggs = Math.max(1, eggs - 1);
    eggs = Math.min(eggs, free, 3);

    const coef = GN.inbreedingCoef(mom.ancestors, mom.id, dad.ancestors, dad.id);
    const gen = Math.max(mom.generation, dad.generation) + 1;
    const anc = GN.buildAncestors(mom.ancestors, mom.id, dad.ancestors, dad.id);

    let newDex = 0, shinies = 0;
    for (let i = 0; i < eggs; i++) {
      const before = Object.keys(state.dex).length;
      const child = makeCreature({
        genome: GN.fertilize(GN.makeGamete(mom.genome), GN.makeGamete(dad.genome)),
        parentIds: [mom.id, dad.id], ancestors: anc, generation: gen, inbreeding: coef,
      });
      if (Object.keys(state.dex).length > before) newDex++;
      if (GN.phenotype(child.genome).shiny) { shinies++; state.shinyCount = (state.shinyCount || 0) + 1; }
      state.roster.push(child);
    }
    state.maxGeneration = Math.max(state.maxGeneration, gen);
    state.totalBred = (state.totalBred || 0) + 1;

    mom.breedCooldownUntil = now + GAME_DAY_MS * 1.5;
    dad.breedCooldownUntil = now + GAME_DAY_MS * 1.5;
    mom.mood = GN.clamp(mom.mood - 12, 0, 100); mom.fullness = GN.clamp(mom.fullness - 18, 0, 100); dad.mood = GN.clamp(dad.mood - 8, 0, 100);

    log(`🥚 「${mom.name}」×「${dad.name}」→ ${eggs}個のタマゴ！(第${gen}世代)${coef > 0.25 ? ` ⚠️近親交配(係数${coef.toFixed(2)})` : ''}`);
    GMAudio.play('breed');
    reactHero('love', mom);
    toast(`💞 ${eggs}個のタマゴが生まれた！`, 'big');
    if (shinies > 0) { setTimeout(() => { toast('✨✨ シャイニー誕生！！ ✨✨', 'shiny'); GMAudio.play('shiny'); reactHero('shiny', mom); }, 700); }
    else if (newDex > 0) setTimeout(() => toast(`📖 図鑑に新登録！(+${newDex})`, 'big'), 700);
    if (coef > 0.25) setTimeout(() => toast('⚠️ 近親交配…弱い子が出やすい', ''), 400);

    breedSlot = { mom: null, dad: null };
    checkAchievements();
  }

  // ---- 図鑑 / 殿堂 / 実績 -------------------------------------------------
  function recordDex(c, silent) {
    if (!state) return;
    const k = GN.dexKey(c.genome);
    if (!state.dex[k]) {
      state.dex[k] = Date.now();
      if (!silent && GN.phenotype(c.genome).shiny) { /* シャイニーtoastは交配側で */ }
    }
  }
  function reconstructGenome(key) {
    const [c, p, e, s, h, sp] = key.split('-');
    const q = {}; for (const t of GN.QUANT_TRAITS) q[t] = [[0, 0], [0, 0], [0, 0], [0, 0], [0, 0]];
    return {
      q, color: [c, c], pattern: [p, p], eye: [e, e], shape: [s, s],
      horn: h === '2' ? ['H', 'H'] : h === '1' ? ['H', 'h'] : ['h', 'h'],
      special: sp === 'X' ? ['X', 'n'] : ['n', 'n'],
    };
  }
  function considerHall(c) {
    const r = c.bestRating || rating(c) || 0;
    if (r <= 0) return;
    const snap = {
      name: c.name, rating: r, gen: c.generation, when: Date.now(),
      reason: c.dead ? c.deadReason : 'のがした',
      genome: c.genome, shiny: GN.phenotype(c.genome).shiny,
      stats: GN.BATTLE_STATS.map((t) => ({ t, v: displayStat(c, t) })),
    };
    state.hall.push(snap);
    state.hall.sort((a, b) => b.rating - a.rating);
    if (state.hall.length > 10) state.hall.length = 10;
    if (state.hall[0] === snap) fxQueue.push({ t: 'hall1' });
  }

  const ACHIEVEMENTS = [
    { id: 'hatch1', ico: '🐣', nm: 'はじめての誕生', desc: 'タマゴを孵す', test: (s) => s.totalHatched >= 1 },
    { id: 'breed1', ico: '💞', nm: 'はじめての交配', desc: '交配でタマゴを作る', test: (s) => s.totalBred >= 1 },
    { id: 'gen5', ico: '🌿', nm: '血統の礎', desc: '第5世代に到達', test: (s) => s.maxGeneration >= 5 },
    { id: 'gen10', ico: '🌳', nm: '名門の系譜', desc: '第10世代に到達', test: (s) => s.maxGeneration >= 10 },
    { id: 'r200', ico: '⭐', nm: '一人前', desc: '評価値200', test: (s) => s.bestRatingEver >= 200 },
    { id: 'r300', ico: '🌟', nm: 'エリート', desc: '評価値300', test: (s) => s.bestRatingEver >= 300 },
    { id: 'r360', ico: '👑', nm: '伝説の血', desc: '評価値360', test: (s) => s.bestRatingEver >= 360 },
    { id: 'shiny1', ico: '✨', nm: 'シャイニー！', desc: '✨個体を発見', test: (s) => (s.shinyCount || 0) >= 1 },
    { id: 'dex10', ico: '📖', nm: '観察者', desc: '図鑑10種', test: (s) => Object.keys(s.dex).length >= 10 },
    { id: 'dex40', ico: '📚', nm: '博士', desc: '図鑑40種', test: (s) => Object.keys(s.dex).length >= 40 },
    { id: 'full', ico: '🏡', nm: '大家族', desc: '飼育枠を満杯に', test: (s) => s.roster.length >= MAX_SLOTS },
    { id: 'hall', ico: '🏆', nm: '殿堂入り', desc: '殿堂に登録', test: (s) => s.hall.length >= 1 },
  ];
  function checkAchievements() {
    for (const a of ACHIEVEMENTS) {
      if (!state.ach[a.id] && a.test(state)) {
        state.ach[a.id] = Date.now();
        toast(`🎖️ 実績解除「${a.nm}」`, 'big'); GMAudio.play('record');
      }
    }
  }

  // ---- 演出処理 -----------------------------------------------------------
  function processFx() {
    for (const fx of fxQueue) {
      const isHero = fx.id === selectedId;
      if (fx.t === 'hatch') { state.totalHatched = (state.totalHatched || 0) + 1; if (isHero) { GMAudio.play('hatch'); reactHero('evolve'); } toast('🐣 うまれた！', 'big'); }
      else if (fx.t === 'adult') { if (isHero) { GMAudio.play('evolve'); reactHero('evolve'); } }
      else if (fx.t === 'death') { GMAudio.play('sad'); }
      else if (fx.t === 'record') { toast(`🎉 最高評価こうしん！ ${fx.r}`, 'big'); GMAudio.play('record'); reactHero('evolve'); }
      else if (fx.t === 'hall1') { /* 殿堂1位 */ }
    }
    fxQueue = [];
  }

  // ---- ログ / トースト ----------------------------------------------------
  function log(m) { state.log.unshift({ t: Date.now(), m }); if (state.log.length > 60) state.log.pop(); }
  function toast(m, cls = '') {
    const layer = document.getElementById('toasts'); if (!layer) return;
    const el = document.createElement('div'); el.className = 'toast ' + cls; el.textContent = m;
    el.addEventListener('animationend', (e) => { if (e.animationName === 'toastOut') el.remove(); });
    layer.appendChild(el);
    setTimeout(() => el.remove(), 3400);
  }

  // ---- セーブ -------------------------------------------------------------
  function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) {} }
  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY); if (!raw) return false;
      state = JSON.parse(raw);
      state.dex = state.dex || {}; state.hall = state.hall || []; state.ach = state.ach || {};
      state.settings = state.settings || { muted: false };
      tickAll(); fxQueue = []; return true;
    } catch (e) { return false; }
  }
  function freshGame() {
    state = {
      nextId: 1, roster: [], log: [], maxGeneration: 1, bestRatingEver: 0, bestRatingName: '',
      dex: {}, hall: [], ach: {}, settings: { muted: false },
      totalHatched: 0, totalBred: 0, shinyCount: 0, startedAt: Date.now(),
    };
    const sexes = ['♀', '♂', '♀', '♂'];
    for (let i = 0; i < 4; i++) {
      const c = makeCreature({ genome: GN.founderGenome(), generation: 1, adultStart: true, sex: sexes[i], silent: true });
      c.name = '創始' + genName();
      state.roster.push(c);
    }
    selectedId = state.roster[0].id;
    log('🧬 ようこそ「ゲノモン」へ！創始4体から最強の血統を育てよう。');
    log('💡 見えるのは表現型P。子に伝わるのは遺伝Gだけ。選抜眼が試される。');
    save();
  }

  // =========================================================================
  // 描画
  // =========================================================================
  const $ = (s) => document.querySelector(s);
  const sel = () => state.roster.find((x) => x.id === selectedId);
  const heroSvg = () => $('#habitat-art .gm-svg');
  const fxLayer = () => $('#habitat-particles');

  function reactHero(type, c) {
    if (c && c.id !== selectedId) return; // ヒーローのみ画面演出
    GMArt.react(heroSvg(), fxLayer(), type);
  }

  const CARE = [
    { k: 'fullness', ico: '🍖', lab: 'まんぷく', cls: 'f-food' },
    { k: 'mood', ico: '💗', lab: 'きげん', cls: 'f-mood' },
    { k: 'cleanliness', ico: '🫧', lab: 'せいけつ', cls: 'f-clean' },
    { k: 'health', ico: '➕', lab: 'けんこう', cls: 'f-health' },
    { k: 'fatigue', ico: '💤', lab: 'ひろう', cls: 'f-fatigue' },
  ];
  const ACTS = [
    { a: 'feed', ico: '🍖', l: 'ごはん' }, { a: 'play', ico: '🎾', l: 'あそぶ' },
    { a: 'clean', ico: '🧹', l: 'そうじ' }, { a: 'rest', ico: '😴', l: 'やすむ' },
    { a: 'med', ico: '💊', l: 'くすり' },
  ];

  // ヒーローの骨組み（構造が変わった時だけ）
  function buildHeroSkeleton(c) {
    const habitat = $('#habitat');
    if (!c) {
      habitat.classList.add('empty');
      $('#habitat-art').innerHTML = '';
      $('#hero-info').innerHTML = '<div class="empty">個体がいません。交配でタマゴを作ろう。</div>';
      $('#care').innerHTML = ''; $('#actions').innerHTML = ''; $('#stats').innerHTML = ''; $('#train').innerHTML = ''; $('#hero-actions').innerHTML = '';
      $('#hero-badges').innerHTML = '';
      return;
    }
    habitat.classList.remove('empty');
    $('#habitat-art').innerHTML = GMArt.buildSVG(c, { size: HERO_SIZE });

    $('#hero-info').innerHTML = `
      <div class="hero-namerow">
        <span id="hero-name" class="hero-name">${c.name}</span>
        <span class="sex ${c.sex === '♀' ? 'f' : 'm'}">${c.sex}</span>
        <button id="btn-rename" class="tiny-ghost" title="なまえ">✏️</button>
      </div>
      <div id="hero-tags" class="hero-tags"></div>
      <div id="hero-pheno" class="hero-pheno"></div>
      <div id="hero-rating" class="hero-rating"></div>`;

    $('#care').innerHTML = CARE.map((m) =>
      `<div class="care-item" data-k="${m.k}"><span class="care-ico">${m.ico}</span><span class="care-lab">${m.lab}</span>
       <div class="care-bar"><div class="care-fill ${m.cls}"></div></div><span class="care-val">0</span></div>`).join('');

    const dis = c.dead || c.stage === 'egg';
    $('#actions').innerHTML = ACTS.map((a) =>
      `<button class="act-btn" data-act="${a.a}" ${(a.a === 'clean' ? c.dead : dis) ? 'disabled' : ''}><span class="ai">${a.ico}</span><span class="al">${a.l}</span></button>`).join('');

    $('#stats').innerHTML = `<div class="stats-head"><span>能力（表現型P）</span><span class="g-on" id="ghdr"></span></div>` +
      GN.BATTLE_STATS.map((t) => `<div class="stat" data-stat="${t}"><span class="stat-l">${GN.STAT_LABEL[t]}</span>
        <div class="stat-bar"><div class="stat-fill"></div><div class="stat-g-mark" style="display:none"></div></div>
        <span class="stat-extra"></span><span class="stat-v">??</span></div>`).join('');

    const tdis = c.dead || c.stage === 'egg' || c.stage === 'baby';
    $('#train').innerHTML = `<span class="train-lab">🏋️</span>` +
      GN.BATTLE_STATS.map((t) => `<button class="mini" data-train="${t}" ${tdis ? 'disabled' : ''}>${GN.STAT_LABEL[t]}↑</button>`).join('') +
      `<button class="mini analyze" data-act="analyze" ${c.dead || c.analyzed ? 'disabled' : ''}>${c.analyzed ? '🔬解析済' : '🔬DNA解析'}</button>`;

    $('#hero-actions').innerHTML =
      (canBreed(c) ? `<button class="btn-pick" data-pick="${c.sex === '♀' ? 'mom' : 'dad'}">💞 交配に${c.sex}選択</button>` : '') +
      `<button class="btn-release" data-act="release">👋 にがす（選抜）</button>`;
  }

  // ヒーローの動的更新（毎tick）
  function updateHero(c) {
    if (!c) return;
    const ph = GN.phenotype(c.genome);
    // タグ
    const tags = [`<span class="tag ${c.stage}">${stageLabel(c.stage)}</span>`, `<span class="tag">第${c.generation}世代</span>`, `<span class="tag">${c.ageDays.toFixed(1)}日齢</span>`];
    if (ph.shiny) tags.push('<span class="tag shiny">✨シャイニー</span>');
    if (c.dead) tags.push(`<span class="tag dead">星になった(${c.deadReason})</span>`);
    const tg = $('#hero-tags'); if (tg) tg.innerHTML = tags.join('');
    const pe = $('#hero-pheno');
    if (pe) pe.innerHTML = `🎨${ph.colorName}${ph.colorHomo ? '(純)' : ''}・${ph.patternName}・目${ph.eyeName}・${ph.shapeName}・ツノ${['なし', '小', '大'][ph.horn]}`;
    const r = rating(c);
    const hr = $('#hero-rating');
    if (hr) hr.innerHTML = `評価値 <b>${r != null ? r : '—'}</b> ${c.bestRating ? `<small>最高${c.bestRating}</small>` : ''}${c.inbreeding > 0.05 ? ` <small>近交${c.inbreeding.toFixed(2)}</small>` : ''}`;

    // 世話メーター
    for (const m of CARE) {
      const item = $(`#care .care-item[data-k="${m.k}"]`); if (!item) continue;
      const v = c[m.k];
      item.querySelector('.care-fill').style.width = v + '%';
      item.querySelector('.care-val').textContent = Math.round(v);
      const low = (m.k !== 'fatigue' && v < 25) || (m.k === 'fatigue' && v > 80);
      item.classList.toggle('low', low);
    }
    // 能力バー
    const gh = $('#ghdr'); if (gh) gh.textContent = c.analyzed ? '／ G=遺伝' : '';
    for (const t of GN.BATTLE_STATS) {
      const row = $(`#stats .stat[data-stat="${t}"]`); if (!row) continue;
      const v = displayStat(c, t);
      row.querySelector('.stat-fill').style.width = (v == null ? 0 : Math.min(100, v / 200 * 100)) + '%';
      row.querySelector('.stat-v').textContent = v == null ? '??' : v;
      const gm = row.querySelector('.stat-g-mark');
      const extra = row.querySelector('.stat-extra');
      let ex = '';
      if (c.train[t]) ex += `<span class="stat-t">+${c.train[t]}</span> `;
      if (c.analyzed) {
        const g = GN.breedingValue(c.genome, t);
        ex += `<span class="stat-g">G${g}</span>`;
        gm.style.display = ''; gm.style.left = `calc(${Math.min(100, g / 200 * 100)}% - 1px)`;
      } else gm.style.display = 'none';
      extra.innerHTML = ex;
    }
    // バッジ
    const badges = [];
    if (ph.shiny) badges.push('<span class="hb shiny">✨SHINY</span>');
    if (c.stage === 'adult' || c.stage === 'elder') badges.push(`<span class="hb">${c.sex}</span>`);
    $('#hero-badges').innerHTML = badges.join('');
    // 表情
    GMArt.applyEmotion(heroSvg(), c);
  }

  function renderHero() {
    const c = sel();
    const sig = c ? `${c.id}|${c.stage}|${c.dead}|${c.analyzed}|${canBreed(c)}` : 'none';
    if (sig !== heroSig) { heroSig = sig; buildHeroSkeleton(c); }
    updateHero(c);
  }

  function renderRoster() {
    const sig = state.roster.map((c) => `${c.id}.${c.stage}.${c.dead ? 1 : 0}.${Math.round(rating(c) || 0)}.${GN.phenotype(c.genome).shiny ? 1 : 0}`).join(',') + `|${selectedId}|${breedSlot.mom}|${breedSlot.dad}`;
    if (sig === rosterSig) return;
    rosterSig = sig;
    let h = '';
    for (const c of state.roster) {
      const r = rating(c); const ph = GN.phenotype(c.genome);
      const cls = [c.id === selectedId ? 'sel' : '', c.dead ? 'dead' : '', (breedSlot.mom === c.id || breedSlot.dad === c.id) ? 'breed' : '', ph.shiny ? 'shiny' : ''].join(' ');
      h += `<div class="card ${cls}" data-id="${c.id}">
        ${ph.shiny ? '<span class="card-shiny">✨</span>' : ''}
        ${(breedSlot.mom === c.id || breedSlot.dad === c.id) ? `<span class="card-flag">${breedSlot.mom === c.id ? '♀' : '♂'}</span>` : ''}
        <div class="card-art">${GMArt.buildSVG(c, { size: 66 })}</div>
        <div class="card-name">${c.name} <span class="sex ${c.sex === '♀' ? 'f' : 'm'}">${c.sex}</span></div>
        <div class="card-sub">${stageLabel(c.stage)}・G${c.generation}</div>
        <div class="card-rate">${r != null ? '評' + r : '???'}</div></div>`;
    }
    for (let i = state.roster.length; i < MAX_SLOTS; i++) h += '<div class="card empty-slot">あき</div>';
    $('#roster').innerHTML = h;
  }

  function renderBreed() {
    const mom = state.roster.find((c) => c.id === breedSlot.mom);
    const dad = state.roster.find((c) => c.id === breedSlot.dad);
    const fill = (el, c, sx) => {
      el.classList.toggle('filled', !!c);
      el.querySelector('.breed-port').innerHTML = c ? GMArt.buildSVG(c, { size: 60 }) : '＋';
      el.querySelector('.breed-nm').textContent = c ? `${sx} ${c.name}` : `${sx} 未選択`;
    };
    fill($('#breed-mom'), mom, '♀'); fill($('#breed-dad'), dad, '♂');
    const info = $('#breed-info'); info.className = 'breed-coef'; info.textContent = '';
    if (mom && dad) {
      const coef = GN.inbreedingCoef(mom.ancestors, mom.id, dad.ancestors, dad.id);
      if (coef > 0.25) { info.textContent = `⚠️ 近交係数 ${coef.toFixed(2)}（弱勢リスク）`; info.classList.add('warn'); }
      else if (coef > 0.05) info.textContent = `近交係数 ${coef.toFixed(2)}`;
      else info.textContent = '血縁なし・健全な交配';
    }
  }

  function renderHUD() {
    $('#hud-gen').textContent = state.maxGeneration;
    $('#hud-best').textContent = state.bestRatingEver;
    $('#hud-slots').textContent = `${state.roster.length}/${MAX_SLOTS}`;
    $('#hud-dex').textContent = Object.keys(state.dex).length;
  }
  function renderLog() { $('#log').innerHTML = state.log.map((e) => `<div class="log-line">${e.m}</div>`).join(''); }

  function renderAll() { renderHUD(); renderHero(); renderRoster(); renderBreed(); renderLog(); }

  // ---- モーダル -----------------------------------------------------------
  function openModal(html) { $('#modal-body').innerHTML = html; $('#modal').classList.add('open'); }
  function closeModal() { $('#modal').classList.remove('open'); }

  function showDex() {
    const keys = Object.keys(state.dex).sort();
    const shinyN = keys.filter((k) => k.endsWith('-X')).length;
    let cells = keys.map((k) => {
      const g = reconstructGenome(k); const ph = GN.phenotype(g);
      return `<div class="dex-cell ${ph.shiny ? 'shiny' : ''}">${GMArt.buildSVG({ id: 'd' + k, genome: g, stage: 'adult' }, { size: 64, uid: 'dex' + k })}
        <div class="dex-cap">${ph.colorName.slice(0, 3)}${ph.shiny ? '✨' : ''}</div></div>`;
    }).join('');
    if (!keys.length) cells = '<p>まだ発見していません。</p>';
    openModal(`<h2>📖 ゲノモン図鑑</h2>
      <div class="dex-stat">発見 ${keys.length} 種${shinyN ? ` ／ ✨シャイニー ${shinyN} 種` : ''}</div>
      <div class="dex-grid">${cells}</div>
      <p class="hint" style="margin-top:12px">体色・模様・目・体型・ツノ・✨の組み合わせを集めよう。突然変異で未知の姿が現れることも。</p>`);
  }
  function showHall() {
    let rows = state.hall.map((s, i) => `
      <div class="hall-row">
        <div class="hall-rank r${i + 1}">${i === 0 ? '👑' : i + 1}</div>
        <div style="width:52px">${GMArt.buildSVG({ id: 'h' + i, genome: s.genome, stage: 'adult' }, { size: 50, uid: 'hall' + i })}</div>
        <div class="hall-info"><div class="hall-nm">${s.name}${s.shiny ? ' ✨' : ''}</div>
          <div class="hall-sub">第${s.gen}世代・${s.reason}・${s.stats.map((x) => GN.STAT_LABEL[x.t][0] + x.v).join(' ')}</div></div>
        <div class="hall-rate">${s.rating}</div></div>`).join('');
    if (!state.hall.length) rows = '<p>まだ殿堂入りはいません。優秀な個体を にがす か 看取る と登録されます。</p>';
    openModal(`<h2>🏆 殿堂（歴代トップ10）</h2>${rows}`);
  }
  function showAch() {
    const rows = ACHIEVEMENTS.map((a) => {
      const got = !!state.ach[a.id];
      return `<div class="ach-row ${got ? '' : 'locked'}"><div class="ach-ico">${got ? a.ico : '🔒'}</div>
        <div><div class="ach-nm">${a.nm}</div><div class="ach-desc">${a.desc}</div></div></div>`;
    }).join('');
    const got = Object.keys(state.ach).length;
    openModal(`<h2>🎖️ 実績 (${got}/${ACHIEVEMENTS.length})</h2>${rows}`);
  }
  function showHelp() {
    openModal(`<h2>🧬 あそびかた</h2>
      <h3>① そだてる（たまごっち）</h3>
      <p>タマゴは時間で孵化。<b>ごはん・あそぶ・そうじ・やすむ・くすり</b>で4つのメーターを保つ。放置すると病気で星になる。幼少期の世話の質が、成体時の能力ボーナスと寿命を決める。キャラをタップでなでなで♪</p>
      <h3>② かけあわせる（育種）</h3>
      <p>成体の♀×♂を交配するとタマゴが誕生。能力は<b>複数遺伝子の足し算（ポリジーン）</b>、見た目は<b>メンデル遺伝</b>で伝わる。減数分裂時に<b>突然変異</b>も起こり、世代を超えて強くなれる。まれに<b>✨シャイニー</b>が出現！</p>
      <h3>③ えらびぬく（選抜）</h3>
      <p>飼育枠は<b>8体</b>。優れた個体を残し、劣る個体は「にがす」。これが選抜圧。</p>
      <h3 class="hl">★ 見える強さ ≠ 遺伝能力</h3>
      <p>表示は <b>P = 遺伝G + 環境E + 育成 + トレーニング</b>。でも子に伝わるのは <b>G だけ</b>。
      トレーニングや好環境で見かけ上強い子を選んでも血統は伸びない。<b>🔬DNA解析</b>で真のGを見抜き、Gの高い個体を選抜しよう。近親交配は係数が上がると弱い子（近交弱勢）が出やすい。</p>
      <p class="hint">※1ゲーム日＝実2分。自動セーブ・閉じても育つ（放置上限あり）。</p>`);
  }

  // ---- イベント -----------------------------------------------------------
  function bindEvents() {
    $('#roster').addEventListener('click', (e) => {
      const card = e.target.closest('.card[data-id]'); if (!card) return;
      selectedId = Number(card.dataset.id); GMAudio.play('click'); renderAll(); save();
    });

    document.querySelector('.hero').addEventListener('click', (e) => {
      const c = sel(); if (!c) return;
      const btn = e.target.closest('button');
      if (btn) {
        if (btn.dataset.act) {
          const a = btn.dataset.act;
          if (a === 'analyze') analyze(c);
          else if (a === 'release') { if (confirm(`「${c.name}」を にがしますか？（取り消せません）`)) releaseCreature(c); }
          else act(c, a);
        } else if (btn.dataset.train) train(c, btn.dataset.train);
        else if (btn.dataset.pick) { breedSlot[btn.dataset.pick] = c.id; GMAudio.play('click'); toast(`交配${btn.dataset.pick === 'mom' ? '♀' : '♂'}に「${c.name}」`); }
        else if (btn.id === 'btn-rename') {
          const n = prompt('あたらしい なまえ', c.name); if (n && n.trim()) { c.name = n.trim().slice(0, 10); }
        }
        save(); renderAll();
      } else if (e.target.closest('#habitat-art')) {
        act(c, 'pet'); renderHero();
      }
    });

    $('#btn-breed').addEventListener('click', () => { breed(); save(); renderAll(); });
    $('#btn-clear-breed').addEventListener('click', () => { breedSlot = { mom: null, dad: null }; renderAll(); });

    $('#btn-dex').addEventListener('click', () => { GMAudio.play('click'); showDex(); });
    $('#btn-hall').addEventListener('click', () => { GMAudio.play('click'); showHall(); });
    $('#btn-ach').addEventListener('click', () => { GMAudio.play('click'); showAch(); });
    $('#btn-help').addEventListener('click', () => { GMAudio.play('click'); showHelp(); });
    $('#btn-sound').addEventListener('click', () => {
      state.settings.muted = !state.settings.muted; GMAudio.setMuted(state.settings.muted);
      $('#btn-sound').textContent = state.settings.muted ? '🔇' : '🔊';
      $('#btn-sound').classList.toggle('muted', state.settings.muted);
      if (!state.settings.muted) GMAudio.play('click');
      save();
    });
    $('#btn-reset').addEventListener('click', () => { if (confirm('全データを消して最初からやり直す？')) { freshGame(); heroSig = ''; rosterSig = ''; renderAll(); } });

    $('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal' || e.target.classList.contains('modal-close')) closeModal(); });

    // 初回ジェスチャで音声有効化
    document.addEventListener('pointerdown', () => GMAudio.ensure(), { once: true });
  }

  // ---- 起動 ---------------------------------------------------------------
  function start() {
    const fresh = !load();
    if (fresh) freshGame();
    if (!selectedId && state.roster[0]) selectedId = state.roster[0].id;
    GMAudio.setMuted(state.settings.muted);
    $('#btn-sound').textContent = state.settings.muted ? '🔇' : '🔊';
    bindEvents();
    renderAll();
    if (fresh) setTimeout(showHelp, 700); // 初回は遊び方を案内
    setInterval(() => { tickAll(); processFx(); save(); renderAll(); }, TICK_MS);
  }
  document.addEventListener('DOMContentLoaded', start);
})();
