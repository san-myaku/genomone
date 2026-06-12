// キュレーションされたパステル〜ビビッド配色。色相はランダムにせず厳選ファミリーから遺伝子で選ぶ。
// base/shadow/light/accent を基準に、レンダラ側で中間色・リムライト・陰影を合成する。
export interface Palette {
  id: string;
  label: string;
  base: string;   // 体のメインカラー
  shadow: string; // 影側（下部の陰影）
  light: string;  // おなか・ハイライト
  outline: string;// 縁取り
  accent: string; // 模様・差し色
  rare?: boolean;
}

export const BODY_PALETTES: Palette[] = [
  // —— やさしいパステル ——
  { id: 'sakura', label: 'さくら', base: '#ffc3dd', shadow: '#ef93bb', light: '#ffe6f1', outline: '#c75f91', accent: '#ff7fb0' },
  { id: 'momo', label: 'もも', base: '#ffceb3', shadow: '#f0a181', light: '#ffe9dc', outline: '#cf7c54', accent: '#ff9268' },
  { id: 'peach', label: 'ピーチ', base: '#ffd9c2', shadow: '#f3ad8e', light: '#fff0e7', outline: '#d18b66', accent: '#ffab85' },
  { id: 'cream', label: 'クリーム', base: '#fff0c9', shadow: '#ecd087', light: '#fffae8', outline: '#cbab53', accent: '#ffd55f' },
  { id: 'lemon', label: 'レモン', base: '#fbf09a', shadow: '#e3d258', light: '#fffce0', outline: '#bba832', accent: '#f2dd4a' },
  { id: 'butter', label: 'バター', base: '#ffe7a0', shadow: '#eac667', light: '#fff6d6', outline: '#c69f3e', accent: '#ffcf5a' },
  { id: 'mint', label: 'ミント', base: '#bdeecb', shadow: '#82d09b', light: '#e2f8e9', outline: '#519f70', accent: '#74d995' },
  { id: 'matcha', label: 'まっちゃ', base: '#cfe09a', shadow: '#aac065', light: '#edf3cd', outline: '#7d913f', accent: '#b6d172' },
  { id: 'aqua', label: 'アクア', base: '#a7ead9', shadow: '#6fcdb6', light: '#d6f7ef', outline: '#3f9c83', accent: '#62d6bd' },
  { id: 'soda', label: 'ソーダ', base: '#b3e6f3', shadow: '#7fc8df', light: '#e1f5fb', outline: '#4d97b4', accent: '#6fc9ec' },
  { id: 'sora', label: 'そら', base: '#bcd2f7', shadow: '#8aaaeb', light: '#e2ecfd', outline: '#5b7fcc', accent: '#7ea3f4' },
  { id: 'periwink', label: 'はなだ', base: '#c3c8f5', shadow: '#9298e6', light: '#e7e9fb', outline: '#666cc4', accent: '#9aa0f0' },
  { id: 'lavender', label: 'ラベンダー', base: '#dac8f5', shadow: '#b394e6', light: '#efe6fb', outline: '#8763c4', accent: '#bb96f0' },
  { id: 'grape', label: 'ぶどう', base: '#c4a7e8', shadow: '#9c78d1', light: '#e7d9f7', outline: '#724eaf', accent: '#a87fe0' },
  { id: 'lilac', label: 'ライラック', base: '#eccaf0', shadow: '#cf99d8', light: '#f9ecfb', outline: '#a166ad', accent: '#dd9ce6' },
  { id: 'coral', label: 'コーラル', base: '#ff9f95', shadow: '#f06f63', light: '#ffd2cb', outline: '#cc5347', accent: '#ff7a6b' },
  { id: 'berry', label: 'ベリー', base: '#f59ac4', shadow: '#dd6aa0', light: '#fcd0e3', outline: '#b34a78', accent: '#ec79ad' },
  { id: 'rose', label: 'ローズ', base: '#f2879f', shadow: '#d65a76', light: '#fbc2cf', outline: '#a93b53', accent: '#e86d88' },
  { id: 'cocoa', label: 'ココア', base: '#d3a276', shadow: '#b07e50', light: '#edcfaf', outline: '#825733', accent: '#c08a5a' },
  { id: 'choco', label: 'チョコ', base: '#a9774f', shadow: '#875730', light: '#cda079', outline: '#5f3a1c', accent: '#7d5230' },
  { id: 'sand', label: 'サンド', base: '#ecd6b2', shadow: '#d3b483', light: '#f8eed8', outline: '#a98c5b', accent: '#d8bd8f' },
  { id: 'snow', label: 'ゆき', base: '#f4f1ef', shadow: '#d6cfca', light: '#ffffff', outline: '#aaa097', accent: '#f0d3df' },
  { id: 'ash', label: 'はいいろ', base: '#c6cad6', shadow: '#9ea4b6', light: '#e7e9ef', outline: '#73788c', accent: '#aab0c4' },
  { id: 'slate', label: 'スレート', base: '#8b93ab', shadow: '#646c86', light: '#b3bace', outline: '#444b63', accent: '#9aa3bd' },
  { id: 'teal', label: 'みなも', base: '#6fc7c0', shadow: '#43a098', light: '#a6e6e0', outline: '#287a72', accent: '#54b8b0' },
  // —— レア（鮮やか・特殊） ——
  { id: 'bubblegum', label: 'バブルガム', base: '#ff8fd0', shadow: '#f25cae', light: '#ffc4e6', outline: '#c83b86', accent: '#ff6fc0', rare: true },
  { id: 'candy', label: 'キャンディ', base: '#ff9ec4', shadow: '#ff6f6f', light: '#ffd6c9', outline: '#d24a6e', accent: '#a0e0ff', rare: true },
  { id: 'sunset', label: 'ゆうやけ', base: '#ff9a6b', shadow: '#f25c8a', light: '#ffd6a0', outline: '#c2466e', accent: '#ffd14a', rare: true },
  { id: 'gold', label: 'こがね', base: '#f7d35e', shadow: '#dca626', light: '#fff0b0', outline: '#a87c12', accent: '#fff4cf', rare: true },
  { id: 'jade', label: 'ひすい', base: '#74e0b8', shadow: '#34b88e', light: '#bdf5e0', outline: '#1f8a68', accent: '#b8ffe6', rare: true },
  { id: 'galaxy', label: 'ぎんが', base: '#7361c9', shadow: '#453a8e', light: '#a99bee', outline: '#2a2168', accent: '#ffb0ff', rare: true },
  { id: 'cosmic', label: 'こんとん', base: '#4a4a7a', shadow: '#2c2c52', light: '#7c7cae', outline: '#18182e', accent: '#ff8fe0', rare: true },
  { id: 'aurora', label: 'オーロラ', base: '#8fe0d0', shadow: '#6f9ce0', light: '#cdf5e8', outline: '#4a6fb0', accent: '#ff9ee0', rare: true },
  { id: 'ember', label: 'ほむら', base: '#ff7a5c', shadow: '#d83a3a', light: '#ffc09a', outline: '#9e2424', accent: '#ffd24a', rare: true },
  { id: 'shadow', label: 'くろ', base: '#4a4453', shadow: '#2e2a35', light: '#6f6878', outline: '#1a1820', accent: '#c9a0ff', rare: true },
];

// グラデーション虹彩。top（上部・明）→ bottom（下部・深）でハズビン風の発光する瞳に。
export interface Iris {
  id: string;
  label: string;
  top: string;
  bottom: string;
  rim: string; // 虹彩の外周リング
  rare?: boolean;
}

export const IRISES: Iris[] = [
  { id: 'ink', label: 'すみ', top: '#5a5466', bottom: '#2a2630', rim: '#16141c' },
  { id: 'choco', label: 'チョコ', top: '#9a6f4e', bottom: '#4e3120', rim: '#2e1c10' },
  { id: 'honey', label: 'はちみつ', top: '#ffd86b', bottom: '#cf8a2a', rim: '#8a541a' },
  { id: 'sky', label: 'スカイ', top: '#9fd8f5', bottom: '#3f7fc8', rim: '#27568f' },
  { id: 'ocean', label: 'うみ', top: '#6fe0d0', bottom: '#2f7fa8', rim: '#1d5570' },
  { id: 'leaf', label: 'リーフ', top: '#bfe88a', bottom: '#4e9c4a', rim: '#2c6b2c' },
  { id: 'rose', label: 'ローズ', top: '#ffb0c4', bottom: '#d6486f', rim: '#8f2f4c' },
  { id: 'grape', label: 'グレープ', top: '#c9a2f5', bottom: '#7a47bd', rim: '#4a2880' },
  { id: 'amber', label: 'アンバー', top: '#ffcf7a', bottom: '#e0822a', rim: '#9e561a' },
  { id: 'ruby', label: 'ルビー', top: '#ff9a9a', bottom: '#d62f3a', rim: '#8f1f27', rare: true },
  { id: 'gold', label: 'こがね', top: '#fff0a0', bottom: '#e0b02a', rim: '#9e7a12', rare: true },
  { id: 'sunset', label: 'ゆうやけ', top: '#ffd86b', bottom: '#f0506e', rim: '#a8304e', rare: true },
  { id: 'aqua', label: 'アクア', top: '#bff5ec', bottom: '#3fbfb0', rim: '#1f7f72', rare: true },
  { id: 'galaxy', label: 'ぎんが', top: '#e0b0ff', bottom: '#6f47c9', rim: '#3a2080', rare: true },
];

// 強膜（白目）の色味。ハズビン風にカラー強膜や黒目も。
export interface Sclera {
  id: string;
  label: string;
  fill: string;
  dark?: boolean; // 暗い強膜（虹彩を発光させる）
  rare?: boolean;
}

export const SCLERAS: Sclera[] = [
  { id: 'white', label: 'しろ', fill: '#fffdfb' },
  { id: 'cream', label: 'クリーム', fill: '#fff4e0' },
  { id: 'pinky', label: 'ほんのりピンク', fill: '#ffeef2' },
  { id: 'minty', label: 'ほんのりミント', fill: '#ecfaf2' },
  { id: 'gold', label: 'こがね', fill: '#fff0b8', rare: true },
  { id: 'rosy', label: 'ばらいろ', fill: '#ffd6e0', rare: true },
  { id: 'noir', label: 'くろ', fill: '#211d2a', dark: true, rare: true },
];

export function paletteById(list: Palette[], id: string): Palette {
  return list.find((p) => p.id === id) ?? list[0];
}
export function irisById(id: string): Iris {
  return IRISES.find((p) => p.id === id) ?? IRISES[0];
}
export function scleraById(id: string): Sclera {
  return SCLERAS.find((p) => p.id === id) ?? SCLERAS[0];
}
