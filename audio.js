/* ============================================================================
 * GENOMONE - ちいさな効果音エンジン (audio.js)
 * Web Audio API で合成。音声ファイル不要。ミュート対応。
 * ========================================================================== */
const GMAudio = (() => {
  'use strict';
  let ctx = null;
  let muted = false;

  function ensure() {
    if (!ctx) {
      try { ctx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch (e) { ctx = null; }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function setMuted(m) { muted = m; }
  function isMuted() { return muted; }

  // 単音
  function tone(freq, t0, dur, type = 'sine', vol = 0.18) {
    if (!ctx) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
    o.connect(g); g.connect(ctx.destination);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }
  function seq(notes, type = 'triangle', step = 0.09, vol = 0.18) {
    if (muted || !ensure()) return;
    const t = ctx.currentTime;
    notes.forEach((f, i) => { if (f) tone(f, t + i * step, step * 1.6, type, vol); });
  }

  // 音色プリセット（だいたい五音音階でかわいく）
  const N = { C5: 523, D5: 587, E5: 659, G5: 784, A5: 880, C6: 1046, E6: 1318, G6: 1568, A4: 440, F5: 698 };
  const SFX = {
    feed:   () => seq([N.E5, N.G5], 'sine', 0.08, 0.16),
    play:   () => seq([N.G5, N.C6, N.E6], 'triangle', 0.07, 0.15),
    clean:  () => seq([N.C6, N.E6, N.G6], 'sine', 0.05, 0.12),
    rest:   () => seq([N.G5, N.E5, N.C5], 'sine', 0.12, 0.13),
    med:    () => seq([N.C6, N.G5, N.C6], 'sine', 0.07, 0.13),
    pet:    () => seq([N.A5, N.C6], 'sine', 0.06, 0.14),
    train:  () => seq([N.C5, N.G5], 'square', 0.06, 0.10),
    click:  () => seq([N.A5], 'sine', 0.04, 0.10),
    breed:  () => seq([N.C5, N.E5, N.G5, N.C6], 'triangle', 0.09, 0.16),
    hatch:  () => seq([N.C5, N.E5, N.G5, N.C6, N.E6, N.G6], 'triangle', 0.1, 0.17),
    evolve: () => seq([N.C5, N.G5, N.C6, N.E6], 'sine', 0.1, 0.16),
    shiny:  () => seq([N.C6, N.D5*2, N.E6, N.G6, N.A5*2, N.C6*2], 'triangle', 0.08, 0.16),
    record: () => seq([N.G5, N.C6, N.E6, N.G6], 'square', 0.08, 0.13),
    sad:    () => seq([N.E5, N.D5, N.A4], 'sine', 0.16, 0.13),
    bad:    () => seq([N.A4, N.F5*0.6], 'square', 0.12, 0.10),
  };
  function play(name) { const f = SFX[name]; if (f && !muted) { ensure(); f(); } }

  return { play, setMuted, isMuted, ensure };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = GMAudio;
