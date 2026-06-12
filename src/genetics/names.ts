// かわいい名前の自動生成（ひらがな2〜3音の組み合わせ）。
const HEAD = ['ぷ', 'も', 'ぴ', 'ぽ', 'ふ', 'こ', 'ち', 'ま', 'り', 'ぬ', 'く', 'た', 'な', 'は', 'み', 'ゆ', 'ら', 'る', 'め', 'の'];
const MID = ['に', 'く', 'ち', 'る', 'ま', 'ら', 'も', 'ぷ', 'ぴ', 'こ', 'た', 'み', 'ゆ', 'ろ', 'ね', 'の', 'ふ'];
const TAIL = ['ん', 'た', 'ぽ', 'ち', 'こ', 'ぴ', 'な', 'み', 'る', 'も', 'すけ', 'りん', 'ぴょん', 'ぽん', 'まる', 'たん', 'ぷう', 'ちー'];

export function randomName(): string {
  const h = pick(HEAD);
  const m = Math.random() < 0.45 ? pick(MID) : '';
  const t = pick(TAIL);
  return h + m + t;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
