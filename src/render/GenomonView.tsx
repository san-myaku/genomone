import { useId } from 'react';
import { Genome, Phenotype, expressGenome } from '../genetics/genome';
import { BODY_PALETTES, EYE_PALETTES, paletteById, Palette } from '../genetics/palettes';
import { bodyPath, ellipsePath, starPath, smoothClosedPath, roundedRect, BodyGeom } from './shapes';

export type Mood = 'happy' | 'normal' | 'sad' | 'sleep' | 'hungry';

interface Props {
  genome: Genome;
  size?: number; // 表示ピクセル
  animate?: boolean;
  mood?: Mood;
  className?: string;
}

// ── 色ユーティリティ ──
function clampByte(v: number) { return Math.max(0, Math.min(255, Math.round(v))); }
function shadeHex(hex: string, amt: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  const f = (c: number) => clampByte(c + amt).toString(16).padStart(2, '0');
  return `#${f(r)}${f(g)}${f(b)}`;
}

function applyShade(p: Palette, shade: number): Palette {
  // shade はおおよそ -16〜16。明るさ方向にずらす。
  const a = shade * 1.6;
  return {
    ...p,
    base: shadeHex(p.base, a),
    shadow: shadeHex(p.shadow, a),
    light: shadeHex(p.light, a),
    outline: shadeHex(p.outline, a * 0.5),
  };
}

export default function GenomonView({ genome, size = 220, animate = true, mood = 'happy', className }: Props) {
  const pheno = expressGenome(genome);
  const uid = useId().replace(/:/g, '');
  const body = paletteById(BODY_PALETTES, pheno.baseColor);
  const bodyP = applyShade(body, pheno.shade);
  const patternPal = paletteById(BODY_PALETTES, pheno.patternColor);
  const eyePal = paletteById(EYE_PALETTES, pheno.eyeColor);

  const { path, geom } = bodyPath(pheno.bodyShape, pheno.size, pheno.plump);
  const clipId = `clip-${uid}`;
  const gradId = `grad-${uid}`;

  return (
    <svg
      viewBox="0 0 200 220"
      width={size}
      height={size * (220 / 200)}
      className={`gn-view ${animate ? 'gn-animate' : ''} ${className ?? ''}`}
      role="img"
      aria-label="ゲノモン"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={bodyP.light} />
          <stop offset="0.55" stopColor={bodyP.base} />
          <stop offset="1" stopColor={bodyP.shadow} />
        </linearGradient>
        <clipPath id={clipId}>
          <path d={path} />
        </clipPath>
        {pheno.aura !== 'none' && <AuraDefs uid={uid} aura={pheno.aura} />}
      </defs>

      {/* 影 */}
      <ellipse cx={geom.cx} cy={203} rx={geom.rx * 0.78} ry={9} fill="rgba(120,90,110,0.16)" />

      {/* オーラ（背面） */}
      {pheno.aura !== 'none' && <AuraBack uid={uid} aura={pheno.aura} geom={geom} />}

      {/* はね（背面） */}
      {pheno.wingType !== 'none' && <Wings type={pheno.wingType} geom={geom} pal={bodyP} />}

      <g className={animate ? 'gn-bob' : ''} style={{ transformOrigin: '100px 200px' }}>
        {/* しっぽ（背面） */}
        {pheno.tailType !== 'none' && <Tail type={pheno.tailType} geom={geom} pal={bodyP} />}

        {/* おみみ（背面） */}
        {pheno.earType !== 'none' && <Ears type={pheno.earType} geom={geom} pal={bodyP} eyePal={eyePal} />}

        {/* 本体 */}
        <path d={path} fill={`url(#${gradId})`} stroke={bodyP.outline} strokeWidth={2.4} strokeLinejoin="round" />

        {/* 模様（クリップ） */}
        <g clipPath={`url(#${clipId})`}>
          <Pattern pheno={pheno} geom={geom} accent={patternPal.accent} light={bodyP.light} />
        </g>

        {/* つの */}
        {pheno.hornType !== 'none' && <Horns type={pheno.hornType} geom={geom} />}

        {/* ほっぺ */}
        <Cheeks type={pheno.cheekType} geom={geom} />

        {/* おめめ */}
        <Eyes pheno={pheno} geom={geom} eyePal={eyePal} mood={mood} animate={animate} />

        {/* おくち */}
        <Mouth pheno={pheno} geom={geom} mood={mood} />

        {/* 寝てるとき zzz */}
        {mood === 'sleep' && (
          <text x={geom.cx + geom.rx * 0.7} y={geom.cy - geom.ry * 0.7} fontSize="16" fill="#9aa6c0" className="gn-zzz">z</text>
        )}
      </g>

      {/* オーラ（前面） */}
      {pheno.aura !== 'none' && <AuraFront uid={uid} aura={pheno.aura} geom={geom} animate={animate} />}
    </svg>
  );
}

// ───────────────────────── パーツ ─────────────────────────

function Ears({ type, geom, pal, eyePal }: { type: string; geom: BodyGeom; pal: Palette; eyePal: Palette }) {
  const { cx, cy, rx, ry } = geom;
  const topY = cy - ry * 0.74;
  const dx = rx * 0.56;
  const inner = pal.light;
  const stroke = pal.outline;
  const ear = (mx: number, flip: number) => {
    switch (type) {
      case 'cat':
        return (
          <g key={mx}>
            <path d={`M ${mx} ${topY + 16} L ${mx + flip * 16} ${topY - 26} L ${mx + flip * 30} ${topY + 8} Z`} fill={pal.base} stroke={stroke} strokeWidth={2.2} strokeLinejoin="round" />
            <path d={`M ${mx + flip * 6} ${topY + 9} L ${mx + flip * 16} ${topY - 14} L ${mx + flip * 23} ${topY + 5} Z`} fill={inner} />
          </g>
        );
      case 'round':
        return <circle key={mx} cx={mx + flip * 8} cy={topY - 6} r={16} fill={pal.base} stroke={stroke} strokeWidth={2.2} />;
      case 'fluffy':
        return (
          <g key={mx}>
            <circle cx={mx + flip * 6} cy={topY - 4} r={13} fill={pal.base} stroke={stroke} strokeWidth={2} />
            <circle cx={mx + flip * 16} cy={topY + 2} r={9} fill={pal.base} stroke={stroke} strokeWidth={2} />
            <circle cx={mx - flip * 4} cy={topY + 4} r={9} fill={pal.base} stroke={stroke} strokeWidth={2} />
          </g>
        );
      case 'bunny':
        return (
          <g key={mx}>
            <ellipse cx={mx + flip * 10} cy={topY - 18} rx={10} ry={26} fill={pal.base} stroke={stroke} strokeWidth={2.2} transform={`rotate(${flip * 16} ${mx + flip * 10} ${topY - 18})`} />
            <ellipse cx={mx + flip * 10} cy={topY - 18} rx={4.5} ry={18} fill={inner} transform={`rotate(${flip * 16} ${mx + flip * 10} ${topY - 18})`} />
          </g>
        );
      case 'floppy':
        return <ellipse key={mx} cx={mx + flip * 16} cy={topY + 18} rx={11} ry={22} fill={pal.base} stroke={stroke} strokeWidth={2.2} transform={`rotate(${flip * 38} ${mx + flip * 16} ${topY + 18})`} />;
      case 'fin':
        return <path key={mx} d={`M ${mx} ${topY + 20} q ${flip * 26} ${-12} ${flip * 22} ${22} q ${-flip * 10} ${-6} ${-flip * 22} ${-2} Z`} fill={eyePal.base} opacity={0.85} stroke={stroke} strokeWidth={1.6} />;
      case 'antenna':
        return (
          <g key={mx}>
            <path d={`M ${mx} ${topY + 10} q ${flip * 6} ${-22} ${flip * 14} ${-30}`} fill="none" stroke={stroke} strokeWidth={2.4} strokeLinecap="round" />
            <circle cx={mx + flip * 14} cy={topY - 20} r={6} fill={pal.accent} stroke={stroke} strokeWidth={1.6} />
          </g>
        );
      default:
        return null;
    }
  };
  return <g>{ear(cx - dx, -1)}{ear(cx + dx, 1)}</g>;
}

function Tail({ type, geom, pal }: { type: string; geom: BodyGeom; pal: Palette }) {
  const bx = geom.cx + geom.rx * 0.74;
  const by = geom.cy + geom.ry * 0.5;
  const stroke = pal.outline;
  switch (type) {
    case 'fluffy':
      return <circle cx={bx + 8} cy={by} r={16} fill={pal.base} stroke={stroke} strokeWidth={2.2} />;
    case 'bushy':
      return (
        <g>
          <circle cx={bx + 12} cy={by - 6} r={14} fill={pal.base} stroke={stroke} strokeWidth={2} />
          <circle cx={bx + 20} cy={by + 6} r={12} fill={pal.base} stroke={stroke} strokeWidth={2} />
          <circle cx={bx + 6} cy={by + 10} r={11} fill={pal.base} stroke={stroke} strokeWidth={2} />
        </g>
      );
    case 'curl':
      return <path d={`M ${bx} ${by} q 24 -4 22 16 q -2 16 -18 12 q -10 -3 -6 -12`} fill="none" stroke={pal.base} strokeWidth={8} strokeLinecap="round" />;
    case 'long':
      return <path d={`M ${bx} ${by} q 30 6 30 -22 q 0 -16 -10 -20`} fill="none" stroke={pal.base} strokeWidth={8} strokeLinecap="round" />;
    case 'leaf':
      return (
        <g transform={`rotate(28 ${bx} ${by})`}>
          <path d={`M ${bx} ${by} q 18 -16 30 0 q -12 16 -30 0 Z`} fill="#9ed47f" stroke="#5fae5a" strokeWidth={2} />
          <line x1={bx + 4} y1={by} x2={bx + 26} y2={by} stroke="#5fae5a" strokeWidth={1.5} />
        </g>
      );
    case 'star':
      return <path d={starPath(bx + 14, by, 13, 13)} fill={pal.accent} stroke={stroke} strokeWidth={2} />;
    default:
      return null;
  }
}

function Wings({ type, geom, pal }: { type: string; geom: BodyGeom; pal: Palette }) {
  const { cx, cy, rx } = geom;
  const wing = (flip: number) => {
    const x = cx + flip * rx * 0.86;
    const y = cy - 6;
    switch (type) {
      case 'fairy':
        return (
          <g key={flip} opacity={0.78}>
            <ellipse cx={x + flip * 14} cy={y - 10} rx={18} ry={24} fill="#dff3ff" stroke="#bfe4f5" strokeWidth={1.6} transform={`rotate(${flip * 18} ${x} ${y})`} />
            <ellipse cx={x + flip * 16} cy={y + 16} rx={13} ry={17} fill="#eaf0ff" stroke="#cdd9f5" strokeWidth={1.6} transform={`rotate(${flip * 24} ${x} ${y})`} />
          </g>
        );
      case 'feather':
        return <path key={flip} d={`M ${x} ${y} q ${flip * 40} ${-30} ${flip * 30} ${24} q ${-flip * 16} ${6} ${-flip * 30} ${-24} Z`} fill="#fff" stroke={pal.shadow} strokeWidth={1.8} opacity={0.92} />;
      case 'bat':
        return <path key={flip} d={`M ${x} ${y - 10} q ${flip * 36} ${-8} ${flip * 40} ${20} l ${-flip * 12} ${-4} l ${-flip * 4} ${12} l ${-flip * 10} ${-8} l ${-flip * 6} ${8} Z`} fill={pal.shadow} stroke={pal.outline} strokeWidth={1.6} />;
      case 'bee':
        return (
          <g key={flip} opacity={0.7}>
            <ellipse cx={x + flip * 12} cy={y - 6} rx={13} ry={17} fill="#fffde0" stroke="#e8dca0" strokeWidth={1.4} transform={`rotate(${flip * 20} ${x} ${y})`} />
          </g>
        );
      default:
        return null;
    }
  };
  return <g className="gn-wing">{wing(-1)}{wing(1)}</g>;
}

function Horns({ type, geom }: { type: string; geom: BodyGeom }) {
  const { cx, cy, ry } = geom;
  const topY = cy - ry * 0.82;
  switch (type) {
    case 'nub':
      return (
        <g fill="#f4e1c1" stroke="#cda873" strokeWidth={1.8}>
          <ellipse cx={cx - 14} cy={topY} rx={6} ry={8} />
          <ellipse cx={cx + 14} cy={topY} rx={6} ry={8} />
        </g>
      );
    case 'unicorn':
      return <path d={`M ${cx} ${topY - 26} L ${cx - 7} ${topY + 6} L ${cx + 7} ${topY + 6} Z`} fill="#ffe9a8" stroke="#d8b45c" strokeWidth={2} strokeLinejoin="round" />;
    case 'devil':
      return (
        <g fill="#e0726f" stroke="#a8413e" strokeWidth={1.8}>
          <path d={`M ${cx - 16} ${topY + 6} q -6 -22 8 -24 q -4 12 2 22 Z`} />
          <path d={`M ${cx + 16} ${topY + 6} q 6 -22 -8 -24 q 4 12 -2 22 Z`} />
        </g>
      );
    case 'antler':
      return (
        <g fill="none" stroke="#c79a63" strokeWidth={3} strokeLinecap="round">
          <path d={`M ${cx - 12} ${topY + 4} q -4 -18 -2 -24 m 0 10 q -8 -4 -12 -8 m 12 -2 q 6 -6 9 -10`} />
          <path d={`M ${cx + 12} ${topY + 4} q 4 -18 2 -24 m 0 10 q 8 -4 12 -8 m -12 -2 q -6 -6 -9 -10`} />
        </g>
      );
    default:
      return null;
  }
}

function Cheeks({ type, geom }: { type: string; geom: BodyGeom }) {
  const { cx, cy, rx, ry } = geom;
  const y = cy + ry * 0.16;
  const dx = rx * 0.6;
  if (type === 'none') return null;
  const at = (mx: number, key: string) => {
    switch (type) {
      case 'blush':
        return <ellipse key={key} cx={mx} cy={y} rx={11} ry={7} fill="#ff9dbf" opacity={0.55} />;
      case 'freckle':
        return (
          <g key={key} fill="#d98a64" opacity={0.7}>
            <circle cx={mx - 5} cy={y} r={1.6} /><circle cx={mx} cy={y - 3} r={1.6} /><circle cx={mx + 5} cy={y} r={1.6} />
            <circle cx={mx - 2} cy={y + 4} r={1.6} /><circle cx={mx + 4} cy={y + 4} r={1.6} />
          </g>
        );
      case 'swirl':
        return <path key={key} d={`M ${mx} ${y} m -6 0 a 6 6 0 1 1 6 6 a 3 3 0 1 1 -3 -3`} fill="none" stroke="#ff9dbf" strokeWidth={1.8} opacity={0.7} />;
      case 'heart':
        return <path key={key} d={heartPath(mx, y, 6)} fill="#ff7fae" opacity={0.8} />;
      case 'star':
        return <path key={key} d={starPath(mx, y, 6, 6)} fill="#ffd24a" opacity={0.9} />;
      default:
        return null;
    }
  };
  return <g>{at(cx - dx, 'l')}{at(cx + dx, 'r')}</g>;
}

function Eyes({ pheno, geom, eyePal, mood, animate }: { pheno: Phenotype; geom: BodyGeom; eyePal: Palette; mood: Mood; animate: boolean }) {
  const { cx, cy, rx, ry } = geom;
  const ey = cy - ry * 0.1;
  const dx = rx * 0.4;
  const base = 11 * pheno.eyeSize * (pheno.size * 0.5 + 0.5);
  const closed = mood === 'sleep' || (mood === 'sad' && false);

  const eye = (mx: number, flip: number, key: string) => {
    if (closed || pheno.eyeType === 'sleepy') {
      return <path key={key} d={`M ${mx - base * 0.8} ${ey} q ${base * 0.8} ${base * 0.7} ${base * 1.6} 0`} fill="none" stroke="#3a3340" strokeWidth={2.6} strokeLinecap="round" />;
    }
    let r = base;
    let ry2 = base;
    if (pheno.eyeType === 'wide') { r = base * 0.95; ry2 = base * 1.18; }
    if (pheno.eyeType === 'button') { r = base * 0.62; ry2 = base * 0.62; }
    if (pheno.eyeType === 'droopy') { ry2 = base * 0.86; }

    if (pheno.eyeType === 'star') {
      return (
        <g key={key}>
          <path d={starPath(mx, ey, base * 1.15, base * 1.15)} fill={eyePal.base} stroke={eyePal.outline} strokeWidth={1.6} />
          <circle cx={mx - flip * base * 0.2} cy={ey - base * 0.25} r={base * 0.3} fill="#fff" />
        </g>
      );
    }
    return (
      <g key={key} className={animate ? 'gn-eye' : ''} style={{ transformOrigin: `${mx}px ${ey}px` }}>
        <ellipse cx={mx} cy={ey} rx={r} ry={ry2} fill={eyePal.base} stroke={eyePal.outline} strokeWidth={1.6} />
        <ellipse cx={mx + flip * r * 0.12} cy={ey + ry2 * 0.18} rx={r * 0.6} ry={ry2 * 0.66} fill={eyePal.shadow} />
        <circle cx={mx - flip * r * 0.32} cy={ey - ry2 * 0.34} r={r * 0.34} fill="#fff" />
        <circle cx={mx + flip * r * 0.28} cy={ey + ry2 * 0.3} r={r * 0.16} fill="#fff" opacity={0.85} />
        {pheno.eyeType === 'sparkle' && <path d={starPath(mx + flip * r * 0.1, ey - ry2 * 0.05, r * 0.5, r * 0.5)} fill="#fff" opacity={0.9} />}
        {pheno.eyeType === 'droopy' && <path d={`M ${mx - r} ${ey - ry2 * 0.5} q ${r} ${-r * 0.4} ${r * 2} 0`} fill="none" stroke={eyePal.outline} strokeWidth={2} strokeLinecap="round" />}
      </g>
    );
  };
  return <g className="gn-eyes">{eye(cx - dx, -1, 'l')}{eye(cx + dx, 1, 'r')}</g>;
}

function Mouth({ pheno, geom, mood }: { pheno: Phenotype; geom: BodyGeom; mood: Mood }) {
  const { cx, cy, ry } = geom;
  const my = cy + ry * 0.26;
  const stroke = '#7a5a52';
  if (mood === 'sad') {
    return <path d={`M ${cx - 8} ${my + 3} q 8 -7 16 0`} fill="none" stroke={stroke} strokeWidth={2.4} strokeLinecap="round" />;
  }
  switch (pheno.mouthType) {
    case 'smile':
      return <path d={`M ${cx - 9} ${my - 1} q 9 9 18 0`} fill="none" stroke={stroke} strokeWidth={2.4} strokeLinecap="round" />;
    case 'smol':
      return <line x1={cx - 3} y1={my} x2={cx + 3} y2={my} stroke={stroke} strokeWidth={2.4} strokeLinecap="round" />;
    case 'cat':
      return <path d={`M ${cx - 10} ${my} q 5 6 10 0 q 5 6 10 0`} fill="none" stroke={stroke} strokeWidth={2.2} strokeLinecap="round" />;
    case 'omouth':
      return <ellipse cx={cx} cy={my + 1} rx={5} ry={6} fill="#d97a86" stroke={stroke} strokeWidth={1.8} />;
    case 'tongue':
      return (
        <g>
          <path d={`M ${cx - 9} ${my - 1} q 9 9 18 0`} fill="none" stroke={stroke} strokeWidth={2.4} strokeLinecap="round" />
          <ellipse cx={cx + 1} cy={my + 5} rx={4} ry={5} fill="#ff9aa8" />
        </g>
      );
    case 'fang':
      return (
        <g>
          <path d={`M ${cx - 9} ${my - 1} q 9 8 18 0`} fill="none" stroke={stroke} strokeWidth={2.2} strokeLinecap="round" />
          <path d={`M ${cx - 4} ${my + 1} l 2 5 l 2 -5 Z`} fill="#fff" stroke={stroke} strokeWidth={0.8} />
        </g>
      );
    case 'beak':
      return <path d={`M ${cx - 6} ${my - 2} L ${cx + 6} ${my - 2} L ${cx} ${my + 6} Z`} fill="#f4b24a" stroke="#cc8a2a" strokeWidth={1.4} strokeLinejoin="round" />;
    default:
      return null;
  }
}

function Pattern({ pheno, geom, accent, light }: { pheno: Phenotype; geom: BodyGeom; accent: string; light: string }) {
  const { cx, cy, rx, ry } = geom;
  switch (pheno.pattern) {
    case 'belly':
      return <ellipse cx={cx} cy={cy + ry * 0.3} rx={rx * 0.56} ry={ry * 0.5} fill={light} opacity={0.85} />;
    case 'spots':
      return (
        <g fill={accent} opacity={0.85}>
          {[[-0.45, -0.3, 7], [0.4, -0.1, 6], [-0.2, 0.4, 8], [0.3, 0.45, 6], [0.05, -0.45, 5], [-0.5, 0.15, 5]].map(([fx, fy, r], i) => (
            <circle key={i} cx={cx + rx * fx} cy={cy + ry * fy} r={r} />
          ))}
        </g>
      );
    case 'patch':
      return (
        <g fill={accent} opacity={0.7}>
          <path d={smoothClosedPath([
            { x: cx + rx * 0.1, y: cy - ry * 0.6 }, { x: cx + rx * 0.7, y: cy - ry * 0.2 },
            { x: cx + rx * 0.5, y: cy + ry * 0.5 }, { x: cx - rx * 0.1, y: cy + ry * 0.2 },
          ])} />
        </g>
      );
    case 'stripes':
      return (
        <g stroke={accent} strokeWidth={6} opacity={0.6} strokeLinecap="round">
          {[-0.5, -0.2, 0.1, 0.4].map((f, i) => (
            <line key={i} x1={cx - rx} y1={cy + ry * f} x2={cx + rx} y2={cy + ry * f + 8} />
          ))}
        </g>
      );
    case 'freckle':
      return (
        <g fill={accent} opacity={0.7}>
          {[[-0.5, 0.05], [-0.42, 0.16], [-0.34, 0.06], [0.5, 0.05], [0.42, 0.16], [0.34, 0.06]].map(([fx, fy], i) => (
            <circle key={i} cx={cx + rx * fx} cy={cy + ry * fy} r={2} />
          ))}
        </g>
      );
    case 'starmark':
      return <path d={starPath(cx, cy - ry * 0.32, 12, 12)} fill={accent} opacity={0.9} />;
    case 'heartmark':
      return <path d={heartPath(cx, cy - ry * 0.36, 12)} fill={accent} opacity={0.9} />;
    default:
      return null;
  }
}

// ── オーラ（レア表現） ──
function AuraDefs({ uid, aura }: { uid: string; aura: string }) {
  if (aura === 'rainbow') {
    return (
      <linearGradient id={`aura-${uid}`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#ff8fb8" /><stop offset="0.33" stopColor="#ffe08a" />
        <stop offset="0.66" stopColor="#8fe0c0" /><stop offset="1" stopColor="#9bb8ff" />
      </linearGradient>
    );
  }
  return null;
}

function AuraBack({ uid, aura, geom }: { uid: string; aura: string; geom: BodyGeom }) {
  if (aura === 'glow') {
    return <ellipse cx={geom.cx} cy={geom.cy} rx={geom.rx * 1.35} ry={geom.ry * 1.35} fill="#fff6c8" opacity={0.5} className="gn-glow" />;
  }
  if (aura === 'rainbow') {
    return <ellipse cx={geom.cx} cy={geom.cy} rx={geom.rx * 1.3} ry={geom.ry * 1.3} fill={`url(#aura-${uid})`} opacity={0.4} className="gn-glow" />;
  }
  if (aura === 'starfield') {
    return <ellipse cx={geom.cx} cy={geom.cy} rx={geom.rx * 1.3} ry={geom.ry * 1.3} fill="#3a2d6b" opacity={0.35} className="gn-glow" />;
  }
  return null;
}

function AuraFront({ uid, aura, geom, animate }: { uid: string; aura: string; geom: BodyGeom; animate: boolean }) {
  void uid;
  const cls = animate ? 'gn-sparkle' : '';
  const spots = [
    { x: geom.cx - geom.rx * 0.9, y: geom.cy - geom.ry * 0.7, r: 5, d: '0s' },
    { x: geom.cx + geom.rx * 0.95, y: geom.cy - geom.ry * 0.2, r: 4, d: '0.5s' },
    { x: geom.cx + geom.rx * 0.7, y: geom.cy + geom.ry * 0.7, r: 5, d: '1s' },
    { x: geom.cx - geom.rx * 0.7, y: geom.cy + geom.ry * 0.5, r: 3.5, d: '1.4s' },
  ];
  if (aura === 'none') return null;
  const color = aura === 'starfield' ? '#fff6d0' : aura === 'rainbow' ? '#fff' : '#fff3b0';
  return (
    <g>
      {spots.map((s, i) => (
        <path key={i} d={starPath(s.x, s.y, s.r, s.r)} fill={color} className={cls} style={{ animationDelay: s.d }} />
      ))}
    </g>
  );
}

function heartPath(cx: number, cy: number, s: number): string {
  return `M ${cx} ${cy + s * 0.8} C ${cx - s * 1.4} ${cy - s * 0.4}, ${cx - s * 0.6} ${cy - s * 1.1}, ${cx} ${cy - s * 0.3} C ${cx + s * 0.6} ${cy - s * 1.1}, ${cx + s * 1.4} ${cy - s * 0.4}, ${cx} ${cy + s * 0.8} Z`;
}

export { ellipsePath, roundedRect };
