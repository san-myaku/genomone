// キュレーションされたパステル配色。ランダム生成でも「かわいい」配色しか出ないよう、
// 色相はランダムにせず、厳選したファミリーから遺伝子で選ばせる。
export interface Palette {
  id: string;
  label: string;
  base: string; // 体のメインカラー
  shadow: string; // 影・輪郭側
  light: string; // おなか・ハイライト
  outline: string; // 縁取り
  accent: string; // 模様・差し色
  rare?: boolean;
}

export const BODY_PALETTES: Palette[] = [
  { id: 'sakura', label: 'さくら', base: '#ffc3dd', shadow: '#f59ec1', light: '#ffe3ef', outline: '#d9759b', accent: '#ff8fb8' },
  { id: 'momo', label: 'もも', base: '#ffd0b8', shadow: '#f5a988', light: '#ffe8db', outline: '#d98a64', accent: '#ff9e74' },
  { id: 'cream', label: 'クリーム', base: '#fff0c9', shadow: '#f0d693', light: '#fffae8', outline: '#d4b15f', accent: '#ffd86b' },
  { id: 'mint', label: 'ミント', base: '#bdeecb', shadow: '#8fd6a4', light: '#e0f8e7', outline: '#5fae77', accent: '#7fdc9c' },
  { id: 'soda', label: 'ソーダ', base: '#b9e6f3', shadow: '#88cbe0', light: '#e1f5fb', outline: '#5aa1bc', accent: '#7bd0ec' },
  { id: 'sora', label: 'そら', base: '#bcd2f7', shadow: '#90aeec', light: '#e2ecfd', outline: '#6786cf', accent: '#84a8f4' },
  { id: 'lavender', label: 'ラベンダー', base: '#dac8f5', shadow: '#b69ee6', light: '#efe6fb', outline: '#9072c9', accent: '#bb9bf0' },
  { id: 'grape', label: 'ぶどう', base: '#c4a7e8', shadow: '#a07fd1', light: '#e7d9f7', outline: '#7d57b5', accent: '#a87fe0' },
  { id: 'lemon', label: 'レモン', base: '#fbf3a0', shadow: '#e6d86a', light: '#fffce0', outline: '#c4b13f', accent: '#f2e25a' },
  { id: 'coral', label: 'コーラル', base: '#ffb3a7', shadow: '#f58575', light: '#ffd9d0', outline: '#d96450', accent: '#ff8a73' },
  { id: 'aqua', label: 'アクア', base: '#a7ead9', shadow: '#79d0bb', light: '#d6f7ef', outline: '#4faa92', accent: '#6fdcc1' },
  { id: 'snow', label: 'ゆき', base: '#f3f1ee', shadow: '#d8d3cd', light: '#ffffff', outline: '#b3aca3', accent: '#e7d6dd' },
  { id: 'cocoa', label: 'ココア', base: '#d3a98a', shadow: '#b3855f', light: '#ecceb6', outline: '#8a5e3c', accent: '#c08e63' },
  { id: 'ash', label: 'はいいろ', base: '#c8ccd6', shadow: '#a5aab8', light: '#e6e8ee', outline: '#7d8294', accent: '#aab0c0' },
  { id: 'matcha', label: 'まっちゃ', base: '#cfe09a', shadow: '#aec370', light: '#ecf2cd', outline: '#849645', accent: '#bcd17b' },
  { id: 'berry', label: 'ベリー', base: '#f3a6c8', shadow: '#dd7aa6', light: '#fbd2e4', outline: '#b8527e', accent: '#ec85b1' },
  // レア配色
  { id: 'galaxy', label: 'ぎんが', base: '#6b5bbd', shadow: '#473a8e', light: '#a99bee', outline: '#2e2466', accent: '#c9a0ff', rare: true },
  { id: 'sunset', label: 'ゆうやけ', base: '#ff9a8b', shadow: '#ff6f91', light: '#ffd3a5', outline: '#c84b6e', accent: '#ffd86b', rare: true },
  { id: 'gold', label: 'こがね', base: '#f6d365', shadow: '#e0b53b', light: '#fff0b8', outline: '#b88a1f', accent: '#fff4cf', rare: true },
  { id: 'jade', label: 'ひすい', base: '#7fe0c0', shadow: '#3fb89a', light: '#c0f5e4', outline: '#1f8a6e', accent: '#b8ffe6', rare: true },
];

export const EYE_PALETTES: Palette[] = [
  { id: 'ink', label: 'すみ', base: '#3a3340', shadow: '#23202a', light: '#6b6478', outline: '#1a1820', accent: '#ffffff' },
  { id: 'choco', label: 'チョコ', base: '#6b4a35', shadow: '#4a3122', light: '#9a7458', outline: '#33231a', accent: '#ffffff' },
  { id: 'sky', label: 'スカイ', base: '#5aa6e0', shadow: '#3a7fc0', light: '#9ecdf2', outline: '#27598f', accent: '#ffffff' },
  { id: 'leaf', label: 'リーフ', base: '#5aae6e', shadow: '#3a8a4f', light: '#9ad6a6', outline: '#276b39', accent: '#ffffff' },
  { id: 'amber', label: 'アンバー', base: '#e0a23a', shadow: '#bd7f1f', light: '#f5cd78', outline: '#8f5f12', accent: '#ffffff' },
  { id: 'rose', label: 'ローズ', base: '#e06a8a', shadow: '#bd4768', light: '#f5a2b8', outline: '#8f2f4c', accent: '#ffffff' },
  { id: 'violet', label: 'バイオレット', base: '#9b6ae0', shadow: '#7847bd', light: '#c5a2f5', outline: '#552f8f', accent: '#ffffff' },
  { id: 'ruby', label: 'ルビー', base: '#e04a55', shadow: '#bd2f3a', light: '#f59aa0', outline: '#8f1f27', accent: '#ffffff', rare: true },
  { id: 'gold', label: 'こがね', base: '#f2c83a', shadow: '#d4a51f', light: '#fae87f', outline: '#a37c12', accent: '#ffffff', rare: true },
  { id: 'rainbow', label: 'にじ', base: '#7a6ae0', shadow: '#5847bd', light: '#c5a2f5', outline: '#3f2f8f', accent: '#ffffff', rare: true },
];

export function paletteById(list: Palette[], id: string): Palette {
  return list.find((p) => p.id === id) ?? list[0];
}
