/* ============================================================================
 * GENOMONE - ゲノモンのお絵かき & 演出 (creature.js)
 *
 * 遺伝子(表現型)から「可愛い」SVGを組み立てる。
 *   体色 / 体型 / 模様 / ツノ・みみ / 目の形 / ✨シャイニー / 成長段階 / 感情
 * idle時はぷるぷる呼吸・まばたき、感情で表情が変わり、世話に反応する。
 * + ハート/きらきら等のパーティクルと、操作フィードバック。
 * ========================================================================== */

const GMArt = (() => {
  'use strict';

  // ---- 色ユーティリティ ---------------------------------------------------
  function hexToRgb(h) {
    h = h.replace('#', '');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  function rgbToHex(r, g, b) {
    const c = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
    return '#' + c(r) + c(g) + c(b);
  }
  function shade(hex, amt) { // amt: -1(黒)..+1(白)
    const [r, g, b] = hexToRgb(hex);
    if (amt >= 0) return rgbToHex(r + (255 - r) * amt, g + (255 - g) * amt, b + (255 - b) * amt);
    return rgbToHex(r * (1 + amt), g * (1 + amt), b * (1 + amt));
  }

  // ---- 感情判定 -----------------------------------------------------------
  function emotionOf(c) {
    if (c.dead) return 'ghost';
    if (c.stage === 'egg') return 'egg';
    if (c._react === 'sleep') return 'sleepy';
    if (c.health < 32) return 'sick';
    if (c.fullness < 22) return 'hungry';
    if (c.mood < 28) return 'sad';
    if (c.fatigue > 80) return 'sleepy';
    if (c.mood > 70 && c.health > 55) return 'joy';
    if (c.mood > 48) return 'happy';
    return 'neutral';
  }

  // ---- 体型ジオメトリ -----------------------------------------------------
  function bodyGeom(ph, stage) {
    let rx = 42, ry = 40;
    if (ph.shape === 't') { rx = 36; ry = 47; }
    else if (ph.shape === 'w') { rx = 49; ry = 35; }
    const sc = { egg: 1, baby: 0.74, juvenile: 0.88, adult: 1, elder: 0.94 }[stage] || 1;
    // ベビーは頭でっかちで更にかわいく
    const head = stage === 'baby' ? 1.06 : 1;
    return { rx: rx * sc, ry: ry * sc * head, sc };
  }

  // ---- 目 -----------------------------------------------------------------
  function eyesSVG(ph, cx, eyeY, ex, emotion) {
    const rw = 11.5;             // 白目半径
    const closed = (emotion === 'sleepy');
    const pupY = eyeY + 1.5;     // 瞳はやや下でかわいく
    const sick = emotion === 'sick';

    function oneEye(side) {
      const x = cx + side * ex;
      if (sick) { // ぐるぐる目
        return `<g><circle cx="${x}" cy="${eyeY}" r="${rw}" fill="#fff" stroke="#0002"/>
          <path d="M${x} ${eyeY} m-5,0 a5,5 0 1,1 5,5" fill="none" stroke="#556" stroke-width="2.2" stroke-linecap="round"/>
          <path d="M${x} ${eyeY} m5,0 a3,3 0 1,0 -3,-3" fill="none" stroke="#556" stroke-width="2.2" stroke-linecap="round"/></g>`;
      }
      if (closed || ph.eye === 'U') { // ねむそう/閉じ目 → やさしい弧
        return `<path d="M${x - 8} ${eyeY} q8 ${ph.eye === 'U' ? 6 : 7} 16 0" fill="none" stroke="#3a3550" stroke-width="2.6" stroke-linecap="round"/>
          <path d="M${x - 9} ${eyeY - 3} q9 -3 ${ph.eye === 'U' ? 9 : 9} 0" fill="none" stroke="#3a3550" stroke-width="1.4" stroke-linecap="round" opacity=".5"/>`;
      }
      // 白目
      const wEll = ph.eye === 'L'
        ? `<ellipse cx="${x}" cy="${eyeY}" rx="${rw}" ry="${rw * 1.05}" fill="#fff" stroke="#0002"/>`
        : `<circle cx="${x}" cy="${eyeY}" r="${rw}" fill="#fff" stroke="#0002"/>`;
      const pr = rw * 0.62; // 瞳
      let lid = '';
      if (ph.eye === 'L') { // たれ目: 外側に下がる上まぶた
        lid = `<path d="M${x - rw} ${eyeY - 2} q ${rw} ${side > 0 ? -6 : -1} ${rw * 2} ${side > 0 ? 5 : 2}" fill="none" stroke="#3a3550" stroke-width="2" stroke-linecap="round" opacity=".55"/>`;
      }
      // きらきら目は星のハイライト
      const star = ph.eye === 'S'
        ? `<path d="M${x + 3} ${pupY - 4} l1.4 3 3 .6 -2.2 2 .6 3-2.8-1.6-2.8 1.6 .6-3-2.2-2 3-.6z" fill="#fff"/>`
        : `<circle cx="${x + 2.4}" cy="${pupY - 2.4}" r="${pr * 0.36}" fill="#fff"/>`;
      return `<g>${wEll}
        <circle cx="${x}" cy="${pupY}" r="${pr}" fill="#2b2740"/>
        <circle cx="${x - 2.6}" cy="${pupY + 2.4}" r="${pr * 0.28}" fill="#fff" opacity=".85"/>
        ${star}${lid}</g>`;
    }
    const eyelash = ph.eye === 'L'
      ? `<path d="M${cx - ex - rw} ${eyeY - 3} l-3 -2 M${cx + ex + rw} ${eyeY - 3} l3 -2" stroke="#3a3550" stroke-width="1.6" stroke-linecap="round"/>`
      : '';
    return `<g class="gm-eyes">${oneEye(-1)}${oneEye(1)}${eyelash}</g>`;
  }

  // ---- 口 -----------------------------------------------------------------
  function mouthD(emotion, cx, my) {
    switch (emotion) {
      case 'joy':    return { d: `M${cx - 7} ${my - 1} q7 9 14 0 q-7 3 -14 0z`, fill: '#c0506a', stroke: 'none' }; // 開いた笑顔
      case 'happy':  return { d: `M${cx - 6} ${my} q6 6 12 0`, fill: 'none', stroke: '#7a3a4a' };
      case 'neutral':return { d: `M${cx - 4} ${my + 1} q4 3 8 0`, fill: 'none', stroke: '#7a3a4a' };
      case 'hungry': return { d: `M${cx - 3} ${my} a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0`, fill: '#c0506a', stroke: 'none' };
      case 'sad':    return { d: `M${cx - 6} ${my + 3} q6 -6 12 0`, fill: 'none', stroke: '#7a3a4a' };
      case 'sick':   return { d: `M${cx - 6} ${my + 1} q3 -3 6 0 q3 3 6 0`, fill: 'none', stroke: '#7a3a4a' };
      case 'sleepy': return { d: `M${cx - 2} ${my} a3 4 0 1 0 4 0 a3 4 0 1 0 -4 0`, fill: '#c0506a', stroke: 'none' };
      default:       return { d: `M${cx - 5} ${my} q5 5 10 0`, fill: 'none', stroke: '#7a3a4a' };
    }
  }
  function mouthSVG(emotion, cx, my) {
    const m = mouthD(emotion, cx, my);
    return `<path class="gm-mouth" d="${m.d}" fill="${m.fill}" stroke="${m.stroke}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`;
  }

  // ---- ツノ / みみ --------------------------------------------------------
  function hornsSVG(ph, cx, cy, rx, ry, baseDark, baseLight) {
    const topY = cy - ry;
    if (ph.horn === 1) { // 一本アンテナ（ぷるぷる玉つき）
      const bx = cx, by = topY + 4;
      return `<g class="gm-antenna">
        <line x1="${bx}" y1="${by}" x2="${bx}" y2="${by - 16}" stroke="${baseDark}" stroke-width="3" stroke-linecap="round"/>
        <circle cx="${bx}" cy="${by - 19}" r="5" fill="${baseLight}" stroke="${baseDark}" stroke-width="1.5"/>
        <circle cx="${bx - 1.5}" cy="${by - 20.5}" r="1.6" fill="#fff8"/></g>`;
    }
    if (ph.horn === 2) { // まるい耳ふたつ
      const off = rx * 0.55;
      const ear = (s) => `<g>
        <ellipse cx="${cx + s * off}" cy="${topY + 6}" rx="11" ry="13" fill="${baseLight}" stroke="${baseDark}" stroke-width="1.6"/>
        <ellipse cx="${cx + s * off}" cy="${topY + 8}" rx="5.5" ry="7" fill="${shade(baseLight, -0.12)}"/></g>`;
      return ear(-1) + ear(1);
    }
    return ''; // 0: つるん
  }

  // ---- 模様（体にクリップ） ----------------------------------------------
  function patternSVG(ph, cx, cy, rx, ry, uid, dark) {
    if (ph.pattern === 'p') return '';
    if (ph.pattern === 'T') { // しま
      let s = '';
      for (let i = -1; i <= 2; i++) {
        const y = cy + i * 13 - 4;
        s += `<rect x="${cx - rx}" y="${y}" width="${rx * 2}" height="6.5" rx="3" fill="${dark}" opacity="0.16"/>`;
      }
      return `<g clip-path="url(#body-${uid})">${s}</g>`;
    }
    // みずたま
    const dots = [[-0.5, -0.45], [0.4, -0.3], [-0.3, 0.2], [0.45, 0.35], [0.05, 0.5], [-0.55, 0.55]];
    let s = '';
    for (const [dx, dy] of dots) s += `<circle cx="${cx + dx * rx}" cy="${cy + dy * ry}" r="${rx * 0.13}" fill="${dark}" opacity="0.18"/>`;
    return `<g clip-path="url(#body-${uid})">${s}</g>`;
  }

  // ---- たまご -------------------------------------------------------------
  function eggSVG(ph, uid, hatchProgress) {
    const base = ph.colorHex;
    const lite = shade(base, 0.35), drk = shade(base, -0.18);
    const cracks = hatchProgress > 0.65
      ? `<path d="M44 56 l8 -6 l-5 9 l9 -3" fill="none" stroke="#0004" stroke-width="1.6"/>`
      : '';
    const spots = ph.pattern === 'D'
      ? `<circle cx="50" cy="58" r="4" fill="${drk}" opacity=".3"/><circle cx="70" cy="70" r="5" fill="${drk}" opacity=".3"/><circle cx="64" cy="48" r="3" fill="${drk}" opacity=".3"/>`
      : ph.pattern === 'T'
        ? `<path d="M40 60 q20 7 40 0 M38 74 q22 7 44 0" stroke="${drk}" stroke-width="4" opacity=".22" fill="none"/>`
        : '';
    return `<g class="gm-egg gm-bob">
      <defs><radialGradient id="eg-${uid}" cx="40%" cy="32%" r="75%">
        <stop offset="0%" stop-color="${lite}"/><stop offset="70%" stop-color="${base}"/><stop offset="100%" stop-color="${drk}"/>
      </radialGradient></defs>
      <ellipse cx="60" cy="98" rx="26" ry="6" fill="#0002" class="gm-shadow"/>
      <path d="M60 30 C82 30 88 64 88 78 a28 26 0 0 1 -56 0 C32 64 38 30 60 30 Z" fill="url(#eg-${uid})" stroke="#0002" stroke-width="1.5"/>
      <ellipse cx="50" cy="50" rx="8" ry="11" fill="#fff" opacity=".35"/>
      ${spots}${cracks}
      <path d="M52 70 q8 5 16 0" fill="none" stroke="#3a3550" stroke-width="2" stroke-linecap="round" opacity=".55"/>
      <circle cx="54" cy="64" r="1.6" fill="#3a3550" opacity=".6"/><circle cx="66" cy="64" r="1.6" fill="#3a3550" opacity=".6"/>
    </g>`;
  }

  // ---- ゴースト（死亡） ---------------------------------------------------
  function ghostSVG(ph) {
    const tint = shade(ph.colorHex, 0.5);
    return `<g class="gm-ghost">
      <path d="M60 32 C42 32 34 48 34 70 l0 18 q6 -8 10 0 q6 8 12 0 q6 -8 12 0 q6 8 10 0 l0 -18 C86 48 78 32 60 32 Z"
        fill="${tint}" opacity=".88" stroke="#0001"/>
      <ellipse cx="52" cy="58" rx="3.2" ry="4.5" fill="#3a3550"/><ellipse cx="68" cy="58" rx="3.2" ry="4.5" fill="#3a3550"/>
      <path d="M54 70 q6 5 12 0" fill="none" stroke="#3a3550" stroke-width="1.8" stroke-linecap="round"/>
      <ellipse cx="60" cy="26" rx="12" ry="3.5" fill="none" stroke="#ffe08a" stroke-width="2.2"/>
    </g>`;
  }

  // ---- 本体ビルド ---------------------------------------------------------
  function buildSVG(c, opts = {}) {
    const size = opts.size || 200;
    const uid = opts.uid != null ? opts.uid : (c.id != null ? c.id : Math.floor(Math.random() * 1e6));
    const ph = GN.phenotype(c.genome);
    const emotion = opts.emotion || emotionOf(c);
    const wrap = (inner, extra = '') =>
      `<svg class="gm-svg ${extra}" viewBox="0 0 120 120" width="${size}" height="${size}" data-uid="${uid}">${inner}</svg>`;

    if (emotion === 'ghost') return wrap(ghostSVG(ph));
    if (emotion === 'egg') {
      const hatch = Math.min(1, (c.ageDays || 0) / 1);
      return wrap(eggSVG(ph, uid, hatch));
    }

    const g = bodyGeom(ph, c.stage);
    const cx = 60, cy = 64;
    const { rx, ry } = g;
    const base = ph.colorHex;
    const lite = shade(base, 0.4), drk = shade(base, -0.16), drk2 = shade(base, -0.28);
    const ex = rx * 0.40;                 // 目の間隔
    const eyeY = cy - ry * 0.12;
    const my = cy + ry * 0.42;            // 口位置

    // パーツ
    const horns = hornsSVG(ph, cx, cy, rx, ry, drk2, lite);
    const pattern = patternSVG(ph, cx, cy, rx, ry, uid, dark(base));
    const eyes = eyesSVG(ph, cx, eyeY, ex, emotion);
    const mouth = mouthSVG(emotion, cx, my);
    const blush = `<ellipse class="gm-blush" cx="${cx - ex - 3}" cy="${eyeY + 9}" rx="6" ry="4" fill="#ff6b8e" opacity=".4"/>
                   <ellipse class="gm-blush" cx="${cx + ex + 3}" cy="${eyeY + 9}" rx="6" ry="4" fill="#ff6b8e" opacity=".4"/>`;
    // 手足
    const feet = `<ellipse cx="${cx - rx * 0.45}" cy="${cy + ry - 2}" rx="9" ry="6" fill="${drk}"/>
                  <ellipse cx="${cx + rx * 0.45}" cy="${cy + ry - 2}" rx="9" ry="6" fill="${drk}"/>`;
    const arms = `<ellipse cx="${cx - rx - 1}" cy="${cy + 3}" rx="6" ry="8" fill="${base}" stroke="#0001"/>
                  <ellipse cx="${cx + rx + 1}" cy="${cy + 3}" rx="6" ry="8" fill="${base}" stroke="#0001"/>`;
    // しっぽ（うれしいとふりふり）
    const tail = `<g class="gm-tail"><ellipse cx="${cx + rx - 2}" cy="${cy + ry * 0.55}" rx="5" ry="9" fill="${drk}" transform="rotate(28 ${cx + rx - 2} ${cy + ry * 0.55})"/>
                  <circle cx="${cx + rx + 6}" cy="${cy + ry * 0.55 + 7}" r="4.5" fill="${lite}"/></g>`;
    // シャイニーきらきら
    const shiny = ph.shiny ? `<g class="gm-shiny">
        ${[[18, 30], [98, 40], [26, 86], [96, 88], [60, 18]].map(([x, y], i) =>
          `<path class="gm-tw t${i}" d="M${x} ${y - 5} l1.6 3.4 3.4.6-2.5 2.3.6 3.4-3.1-1.8-3.1 1.8.6-3.4-2.5-2.3 3.4-.6z" fill="#fff4b8"/>`).join('')}
      </g>` : '';

    const defs = `<defs>
      <radialGradient id="bg-${uid}" cx="38%" cy="30%" r="80%">
        <stop offset="0%" stop-color="${lite}"/><stop offset="62%" stop-color="${base}"/><stop offset="100%" stop-color="${drk}"/>
      </radialGradient>
      <clipPath id="body-${uid}"><ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"/></clipPath>
      ${ph.shiny ? `<linearGradient id="sh-${uid}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#fff" stop-opacity=".0"/><stop offset="50%" stop-color="#fff" stop-opacity=".35"/><stop offset="100%" stop-color="#fff" stop-opacity="0"/></linearGradient>` : ''}
    </defs>`;

    const body = `
      <ellipse class="gm-shadow" cx="${cx}" cy="${cy + ry + 4}" rx="${rx * 0.92}" ry="7" fill="#0002"/>
      <g class="gm-bob">
        ${horns}
        ${tail}
        ${arms}
        <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#bg-${uid})" stroke="${drk}" stroke-width="1.5"/>
        ${pattern}
        ${ph.shiny ? `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#sh-${uid})"/>` : ''}
        <ellipse cx="${cx - rx * 0.42}" cy="${cy - ry * 0.45}" rx="${rx * 0.26}" ry="${ry * 0.3}" fill="#fff" opacity=".4"/>
        ${feet}
        ${blush}
        ${eyes}
        ${mouth}
        ${shiny}
      </g>`;

    return wrap(defs + body, ph.shiny ? 'is-shiny' : '');
  }
  function dark(hex) { return shade(hex, -0.45); }

  // ---- 既存ノードの表情だけ更新（ヒーロー用・滑らか） ---------------------
  function applyEmotion(svgRoot, c) {
    if (!svgRoot) return;
    const emotion = emotionOf(c);
    const bob = svgRoot.querySelector('.gm-bob');
    if (bob) {
      bob.classList.remove('e-joy', 'e-happy', 'e-sad', 'e-sick', 'e-sleepy', 'e-hungry', 'e-neutral');
      bob.classList.add('e-' + emotion);
    }
    svgRoot.classList.toggle('mood-joy', emotion === 'joy');
  }

  // =========================================================================
  // パーティクル / 演出
  // =========================================================================
  const EMO = {
    heart: '❤️', spark: '✨', star: '⭐', note: '🎵', zzz: '💤',
    sweat: '💦', food: '🍖', plus: '💚', poop: '💩', tear: '💧', bubble: '🫧',
  };
  function spawnParticles(layer, type, count = 6, opts = {}) {
    if (!layer) return;
    const glyph = EMO[type] || type;
    const W = layer.clientWidth || 300, H = layer.clientHeight || 300;
    const ox = opts.x != null ? opts.x : W / 2;
    const oy = opts.y != null ? opts.y : H * 0.55;
    for (let i = 0; i < count; i++) {
      const el = document.createElement('span');
      el.className = 'particle';
      el.textContent = glyph;
      const dx = (Math.random() - 0.5) * (opts.spread || 90);
      const dy = -(40 + Math.random() * 70);
      const rot = (Math.random() - 0.5) * 80;
      el.style.left = (ox + dx) + 'px';
      el.style.top = oy + 'px';
      el.style.fontSize = (opts.size || (14 + Math.random() * 12)) + 'px';
      el.style.setProperty('--dy', dy + 'px');
      el.style.setProperty('--dx', (dx * 0.4) + 'px');
      el.style.setProperty('--rot', rot + 'deg');
      el.style.animationDelay = (Math.random() * 0.18) + 's';
      el.addEventListener('animationend', () => el.remove());
      layer.appendChild(el);
    }
  }

  // 操作リアクション: 表情の一時変化 + パーティクル + 弾み
  function react(svgRoot, layer, type) {
    if (svgRoot) {
      svgRoot.classList.remove('rx-bounce', 'rx-wiggle', 'rx-jump', 'rx-flash');
      void svgRoot.offsetWidth; // reflow
    }
    const add = (cls) => { if (svgRoot) svgRoot.classList.add(cls); };
    switch (type) {
      case 'feed':  add('rx-bounce'); spawnParticles(layer, 'food', 4); setTimeout(() => spawnParticles(layer, 'heart', 5), 250); break;
      case 'play':  add('rx-jump');   spawnParticles(layer, 'star', 6); spawnParticles(layer, 'note', 4, { spread: 130 }); break;
      case 'clean': add('rx-wiggle'); spawnParticles(layer, 'bubble', 8, { spread: 120 }); spawnParticles(layer, 'spark', 5); break;
      case 'rest':  spawnParticles(layer, 'zzz', 5, { x: (layer.clientWidth || 300) * 0.62 }); break;
      case 'med':   add('rx-flash');  spawnParticles(layer, 'plus', 6); break;
      case 'pet':   add('rx-wiggle'); spawnParticles(layer, 'heart', 4); break;
      case 'train': add('rx-bounce'); spawnParticles(layer, 'spark', 5); break;
      case 'love':  spawnParticles(layer, 'heart', 14, { spread: 160, size: 22 }); break;
      case 'evolve':add('rx-flash');  spawnParticles(layer, 'spark', 16, { spread: 160, size: 20 }); break;
      case 'shiny': spawnParticles(layer, 'spark', 22, { spread: 200, size: 24 }); spawnParticles(layer, 'star', 10, { spread: 200 }); break;
    }
  }

  return { buildSVG, emotionOf, applyEmotion, spawnParticles, react, shade };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = GMArt;
