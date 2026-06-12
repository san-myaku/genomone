// 体型パスの生成。すべて「角度→半径倍率」のプロファイルから滑らかな閉曲線を作ることで、
// どの体型もぷにっと丸くキュートに仕上がるようにしている。

export interface Pt { x: number; y: number; }

// Catmull-Rom を3次ベジェに変換した閉パス
export function smoothClosedPath(points: Pt[]): string {
  const n = points.length;
  if (n < 3) return '';
  let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n];
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    const p3 = points[(i + 2) % n];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return d + ' Z';
}

function profileToPoints(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  profile: { a: number; r: number }[],
): Pt[] {
  return profile.map(({ a, r }) => {
    const rad = (a * Math.PI) / 180;
    return { x: cx + Math.cos(rad) * rx * r, y: cy + Math.sin(rad) * ry * r };
  });
}

// 各体型の半径プロファイル（角度0=右, 90=下, -90=上）
const PROFILES: Record<string, { a: number; r: number }[]> = {
  round: ring(1),
  mochi: ring(1),
  blob: [
    { a: -90, r: 0.92 }, { a: -45, r: 1.0 }, { a: 0, r: 1.03 }, { a: 45, r: 1.06 },
    { a: 90, r: 1.06 }, { a: 135, r: 1.02 }, { a: 180, r: 1.0 }, { a: -135, r: 0.95 },
  ],
  pear: [
    { a: -90, r: 0.64 }, { a: -50, r: 0.82 }, { a: 0, r: 1.0 }, { a: 50, r: 1.1 },
    { a: 90, r: 1.08 }, { a: 130, r: 1.1 }, { a: 180, r: 1.0 }, { a: -130, r: 0.82 },
  ],
  bean: [
    { a: -90, r: 0.96 }, { a: -45, r: 1.0 }, { a: 0, r: 0.82 }, { a: 45, r: 1.0 },
    { a: 90, r: 1.0 }, { a: 135, r: 1.04 }, { a: 180, r: 1.02 }, { a: -135, r: 1.04 },
  ],
  droplet: [
    { a: -90, r: 1.28 }, { a: -55, r: 0.86 }, { a: 0, r: 0.98 }, { a: 55, r: 1.06 },
    { a: 90, r: 1.08 }, { a: 125, r: 1.06 }, { a: 180, r: 0.98 }, { a: -125, r: 0.86 },
  ],
  egg: [
    { a: -90, r: 0.84 }, { a: -45, r: 0.92 }, { a: 0, r: 0.98 }, { a: 45, r: 1.06 },
    { a: 90, r: 1.08 }, { a: 135, r: 1.06 }, { a: 180, r: 0.98 }, { a: -135, r: 0.92 },
  ],
};

function ring(r: number): { a: number; r: number }[] {
  return [-90, -45, 0, 45, 90, 135, 180, -135].map((a) => ({ a, r }));
}

export interface BodyGeom {
  cx: number; cy: number; rx: number; ry: number;
}

// 体型→本体パスと寸法
export function bodyPath(shape: string, size: number, plump: number): { path: string; geom: BodyGeom } {
  const cx = 100;
  const cy = 120;
  const base = 54 * size;
  let rx = base * (0.84 + 0.3 * plump);
  let ry = base * (1.0 - 0.14 * plump);

  if (shape === 'mochi') { rx = base * (1.12 + 0.18 * plump); ry = base * 0.78; }
  if (shape === 'pear') { ry = base * 1.05; }
  if (shape === 'droplet') { ry = base * 1.06; }

  const geom: BodyGeom = { cx, cy, rx, ry };

  if (shape === 'marshmallow') {
    return { path: roundedRect(cx, cy, rx * 1.02, ry * 0.98, Math.min(rx, ry) * 0.5), geom };
  }
  if (shape === 'star') {
    return { path: starPath(cx, cy, rx * 1.12, ry * 1.12), geom: { cx, cy, rx: rx * 0.8, ry: ry * 0.8 } };
  }

  const profile = PROFILES[shape] ?? PROFILES.round;
  return { path: smoothClosedPath(profileToPoints(cx, cy, rx, ry, profile)), geom };
}

export function roundedRect(cx: number, cy: number, rx: number, ry: number, rad: number): string {
  const x = cx - rx, y = cy - ry, w = rx * 2, h = ry * 2;
  return `M ${x + rad} ${y} h ${w - 2 * rad} a ${rad} ${rad} 0 0 1 ${rad} ${rad} v ${h - 2 * rad} a ${rad} ${rad} 0 0 1 ${-rad} ${rad} h ${-(w - 2 * rad)} a ${rad} ${rad} 0 0 1 ${-rad} ${-rad} v ${-(h - 2 * rad)} a ${rad} ${rad} 0 0 1 ${rad} ${-rad} Z`;
}

// 角の丸い5角星
export function starPath(cx: number, cy: number, rx: number, ry: number): string {
  const pts: Pt[] = [];
  for (let i = 0; i < 10; i++) {
    const ang = (-90 + i * 36) * (Math.PI / 180);
    const rr = i % 2 === 0 ? 1 : 0.52;
    pts.push({ x: cx + Math.cos(ang) * rx * rr, y: cy + Math.sin(ang) * ry * rr });
  }
  return smoothClosedPath(pts);
}

export function ellipsePath(cx: number, cy: number, rx: number, ry: number): string {
  return `M ${cx - rx} ${cy} a ${rx} ${ry} 0 1 0 ${rx * 2} 0 a ${rx} ${ry} 0 1 0 ${-rx * 2} 0 Z`;
}
