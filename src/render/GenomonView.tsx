import { useId } from 'react';
import { Genome, Phenotype, expressGenome } from '../genetics/genome';
import { BODY_PALETTES, paletteById, irisById, scleraById, Palette } from '../genetics/palettes';
import { bodyPath, starPath, smoothClosedPath, roundedRect, BodyGeom } from './shapes';

export type Mood = 'happy' | 'normal' | 'sad' | 'sleep' | 'hungry';

interface Props {
  genome: Genome;
  size?: number;
  animate?: boolean;
  mood?: Mood;
  className?: string;
}

// ── 色ユーティリティ ──
function clampByte(v: number) { return Math.max(0, Math.min(255, Math.round(v))); }
function parseHex(hex: string) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function toHex(r: number, g: number, b: number) {
  const f = (c: number) => clampByte(c).toString(16).padStart(2, '0');
  return `#${f(r)}${f(g)}${f(b)}`;
}
function shadeHex(hex: string, amt: number): string {
  const [r, g, b] = parseHex(hex);
  return toHex(r + amt, g + amt, b + amt);
}
function mixHex(a: string, b: string, t: number): string {
  const [r1, g1, b1] = parseHex(a);
  const [r2, g2, b2] = parseHex(b);
  return toHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}
function applyShade(p: Palette, shade: number): Palette {
  const a = shade * 1.5;
  return {
    ...p,
    base: shadeHex(p.base, a),
    shadow: shadeHex(p.shadow, a),
    light: shadeHex(p.light, a),
    outline: shadeHex(p.outline, a * 0.4),
  };
}

const LID = '#3a2b39';

export default function GenomonView({ genome, size = 240, animate = true, mood = 'happy', className }: Props) {
  const pheno = expressGenome(genome);
  const uid = useId().replace(/:/g, '');
  const bodyP = applyShade(paletteById(BODY_PALETTES, pheno.baseColor), pheno.shade);
  const patternPal = paletteById(BODY_PALETTES, pheno.patternColor);

  const { path, geom } = bodyPath(pheno.bodyShape, pheno.size, pheno.plump);
  const mid = mixHex(bodyP.base, bodyP.shadow, 0.55);

  const clipId = `c${uid}`;
  const gradId = `g${uid}`;
  const aoId = `ao${uid}`;

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
        <radialGradient id={gradId} cx="0.4" cy="0.3" r="0.85">
          <stop offset="0" stopColor={shadeHex(bodyP.light, 8)} />
          <stop offset="0.45" stopColor={bodyP.base} />
          <stop offset="0.8" stopColor={mid} />
          <stop offset="1" stopColor={bodyP.shadow} />
        </radialGradient>
        <radialGradient id={aoId} cx="0.5" cy="0.96" r="0.7">
          <stop offset="0" stopColor={bodyP.shadow} stopOpacity="0.55" />
          <stop offset="0.55" stopColor={bodyP.shadow} stopOpacity="0.12" />
          <stop offset="1" stopColor={bodyP.shadow} stopOpacity="0" />
        </radialGradient>
        <clipPath id={clipId}><path d={path} /></clipPath>
        {pheno.aura === 'rainbow' && (
          <linearGradient id={`aura-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ff8fb8" /><stop offset="0.33" stopColor="#ffe08a" />
            <stop offset="0.66" stopColor="#8fe0c0" /><stop offset="1" stopColor="#9bb8ff" />
          </linearGradient>
        )}
      </defs>

      {/* 接地影 */}
      <ellipse cx={geom.cx} cy={205} rx={geom.rx * 0.74} ry={8.5} fill="rgba(110,80,100,0.16)" />

      {/* オーラ（背面） */}
      {pheno.aura !== 'none' && <AuraBack uid={uid} aura={pheno.aura} geom={geom} />}
      {pheno.wingType !== 'none' && <Wings type={pheno.wingType} geom={geom} pal={bodyP} />}

      <g className={animate ? 'gn-bob' : ''} style={{ transformOrigin: '100px 200px' }}>
        {pheno.tailType !== 'none' && <Tail type={pheno.tailType} geom={geom} pal={bodyP} accent={patternPal.accent} />}
        {pheno.limbType !== 'none' && <Limbs type={pheno.limbType} geom={geom} pal={bodyP} mid={mid} />}
        {pheno.earType !== 'none' && <Ears type={pheno.earType} geom={geom} pal={bodyP} />}

        {/* 本体 */}
        <path d={path} fill={`url(#${gradId})`} stroke={bodyP.outline} strokeWidth={2.6} strokeLinejoin="round" />

        {/* 模様 */}
        <g clipPath={`url(#${clipId})`}>
          <Belly geom={geom} light={bodyP.light} />
          <Pattern pheno={pheno} geom={geom} accent={patternPal.accent} light={bodyP.light} shadow={bodyP.shadow} />
          {/* 環境遮蔽（下部の陰） */}
          <path d={path} fill={`url(#${aoId})`} />
          {/* リムライト（上部の光沢） */}
          <ellipse cx={geom.cx - geom.rx * 0.18} cy={geom.cy - geom.ry * 0.55} rx={geom.rx * 0.5} ry={geom.ry * 0.28} fill="#ffffff" opacity={0.22} />
        </g>

        {pheno.hornType !== 'none' && <Horns type={pheno.hornType} geom={geom} />}
        <Cheeks type={pheno.cheekType} geom={geom} uid={uid} />
        <Eyes pheno={pheno} geom={geom} mood={mood} animate={animate} uid={uid} accent={patternPal.accent} />
        <Mouth pheno={pheno} geom={geom} mood={mood} />

        {mood === 'sleep' && (
          <text x={geom.cx + geom.rx * 0.66} y={geom.cy - geom.ry * 0.66} fontSize="15" fontWeight="bold" fill="#a9a0c0" className="gn-zzz">Z</text>
        )}
      </g>

      {pheno.aura !== 'none' && <AuraFront aura={pheno.aura} geom={geom} animate={animate} />}
    </svg>
  );
}

// ───────────────────────── 目（主役） ─────────────────────────

interface EyeShapeDef { w: number; h: number; outer: number; inner: number; topH: number; botH: number; smooth: number; }
const EYE_SHAPES: Record<string, EyeShapeDef> = {
  round:   { w: 1.0,  h: 1.0,  outer: 0,     inner: 0,    topH: 0.52, botH: 0.5,  smooth: 0.42 },
  almond:  { w: 1.14, h: 0.92, outer: 0,     inner: 0.06, topH: 0.5,  botH: 0.42, smooth: 0.34 },
  upturn:  { w: 1.12, h: 0.9,  outer: -0.18, inner: 0.08, topH: 0.5,  botH: 0.4,  smooth: 0.32 },
  droopy:  { w: 1.08, h: 0.95, outer: 0.2,   inner: -0.04,topH: 0.46, botH: 0.46, smooth: 0.4 },
  wide:    { w: 1.04, h: 1.14, outer: 0,     inner: 0.02, topH: 0.56, botH: 0.5,  smooth: 0.44 },
  sharp:   { w: 1.18, h: 0.82, outer: -0.12, inner: 0.06, topH: 0.42, botH: 0.34, smooth: 0.2 },
  sleepy:  { w: 1.06, h: 0.72, outer: 0.06,  inner: 0.02, topH: 0.36, botH: 0.4,  smooth: 0.4 },
  jewel:   { w: 1.0,  h: 1.06, outer: 0,     inner: 0,    topH: 0.54, botH: 0.54, smooth: 0.24 },
};

function makeEyePath(cx: number, cy: number, w: number, h: number, flip: number, d: EyeShapeDef): string {
  const xi = cx - flip * w * 0.5, xo = cx + flip * w * 0.5;
  const yi = cy + d.inner * h, yo = cy + d.outer * h;
  const yt = cy - d.topH * h, yb = cy + d.botH * h;
  const hx = flip * w * d.smooth;
  return [
    `M ${xi.toFixed(2)} ${yi.toFixed(2)}`,
    `C ${(xi + hx).toFixed(2)} ${(yi - h * 0.4).toFixed(2)}, ${(cx - hx).toFixed(2)} ${yt.toFixed(2)}, ${cx.toFixed(2)} ${yt.toFixed(2)}`,
    `C ${(cx + hx).toFixed(2)} ${yt.toFixed(2)}, ${(xo - hx).toFixed(2)} ${(yo - h * 0.4).toFixed(2)}, ${xo.toFixed(2)} ${yo.toFixed(2)}`,
    `C ${(xo - hx).toFixed(2)} ${(yo + h * 0.42).toFixed(2)}, ${(cx + hx).toFixed(2)} ${yb.toFixed(2)}, ${cx.toFixed(2)} ${yb.toFixed(2)}`,
    `C ${(cx - hx).toFixed(2)} ${yb.toFixed(2)}, ${(xi + hx).toFixed(2)} ${(yi + h * 0.42).toFixed(2)}, ${xi.toFixed(2)} ${yi.toFixed(2)} Z`,
  ].join(' ');
}

function pupilShape(type: string, cx: number, cy: number, ir: number): JSX.Element {
  const dark = '#1c141f';
  switch (type) {
    case 'slit':
      return <ellipse cx={cx} cy={cy} rx={ir * 0.22} ry={ir * 0.94} fill={dark} />;
    case 'heart':
      return <path d={heartPath(cx, cy + ir * 0.08, ir * 0.6)} fill={dark} />;
    case 'star':
      return <path d={starPath(cx, cy, ir * 0.68, ir * 0.68)} fill={dark} />;
    case 'big':
      return <circle cx={cx} cy={cy} r={ir * 0.56} fill={dark} />;
    case 'sparkle':
      return (
        <g>
          <circle cx={cx} cy={cy} r={ir * 0.42} fill={dark} />
          <path d={starPath(cx + ir * 0.22, cy + ir * 0.22, ir * 0.26, ir * 0.26)} fill="#fff" opacity={0.9} />
        </g>
      );
    default:
      return <circle cx={cx} cy={cy} r={ir * 0.44} fill={dark} />;
  }
}

function Lashes({ xo, yo, flip, len, count }: { xo: number; yo: number; flip: number; len: number; count: number }) {
  const lashes = [];
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    const ang = -0.6 - t * 0.5; // 外側ほど上向き
    const ox = xo + flip * (i - count / 2) * 2.2;
    const ex = ox + flip * Math.cos(ang) * len;
    const ey = yo - Math.sin(-ang) * len - len * 0.2;
    lashes.push(
      <path key={i} d={`M ${ox} ${yo} Q ${(ox + ex) / 2 + flip * 1.5} ${(yo + ey) / 2 - 2} ${ex} ${ey} L ${ex + flip * 1.5} ${ey + 2.5} Q ${(ox + ex) / 2 + flip * 2} ${(yo + ey) / 2} ${ox + flip * 2} ${yo + 1} Z`} fill={LID} />,
    );
  }
  return <g>{lashes}</g>;
}

function Eyes({ pheno, geom, mood, animate, uid, accent }: { pheno: Phenotype; geom: BodyGeom; mood: Mood; animate: boolean; uid: string; accent: string }) {
  const { cx, cy, rx, ry } = geom;
  const bodyScale = pheno.size * 0.4 + 0.6;
  const ey = cy - ry * 0.02;
  const unit = 27 * pheno.eyeSize * bodyScale;
  const shapeKey = mood === 'sleep' ? 'sleepy' : pheno.eyeType;
  const shape = EYE_SHAPES[shapeKey] ?? EYE_SHAPES.round;
  const ew = unit * shape.w * 0.72;
  const eh = unit * shape.h * 0.9;
  const dx = Math.max(rx * pheno.eyeSpacing, ew * 0.62); // 大きな目でも重ならない間隔
  const iris = irisById(pheno.eyeColor);
  const sclera = scleraById(pheno.sclera);
  const closed = mood === 'sleep';

  const lashCount = { none: 0, natural: 1, long: 2, glam: 3, both: 2 }[pheno.lashType] ?? 0;
  const lashLen = { none: 0, natural: 8, long: 13, glam: 12, both: 10 }[pheno.lashType] ?? 0;

  const eye = (mx: number, flip: number, key: string) => {
    const xo = mx + flip * ew * 0.5;
    const yo = ey + shape.outer * eh;

    if (closed) {
      return (
        <g key={key}>
          <path d={`M ${mx - ew * 0.5} ${ey + 1} Q ${mx} ${ey + eh * 0.5} ${mx + ew * 0.5} ${ey + 1}`} fill="none" stroke={LID} strokeWidth={3} strokeLinecap="round" />
          {lashCount > 0 && <Lashes xo={xo} yo={yo + eh * 0.18} flip={flip} len={lashLen * 0.7} count={lashCount} />}
        </g>
      );
    }

    const eyePath = makeEyePath(mx, ey, ew, eh, flip, shape);
    const eClip = `eye${uid}${key}`;
    const gradEye = `ir${uid}${key}`;
    const icx = mx;
    const icy = ey + eh * 0.14;
    const ir = Math.min(ew * 0.58, eh * 0.54);

    return (
      <g key={key} className={animate ? 'gn-eye' : ''} style={{ transformOrigin: `${mx}px ${ey}px` }}>
        <defs>
          <clipPath id={eClip}><path d={eyePath} /></clipPath>
          <linearGradient id={gradEye} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={iris.top} />
            <stop offset="1" stopColor={iris.bottom} />
          </linearGradient>
        </defs>

        {/* めもとマーク（背面） */}
        {pheno.eyeMark === 'patch' && <ellipse cx={mx} cy={ey} rx={ew * 0.72} ry={eh * 0.72} fill={accent} opacity={0.5} />}
        {pheno.eyeMark === 'mask' && <ellipse cx={mx} cy={ey} rx={ew * 0.82} ry={eh * 0.8} fill={mixHexLocal(accent, '#2a2230', 0.5)} opacity={0.7} />}

        {/* 白目 */}
        <path d={eyePath} fill={sclera.fill} stroke={shadeHex(sclera.fill, -34)} strokeWidth={1} />

        <g clipPath={`url(#${eClip})`}>
          {/* 虹彩（縦グラデで発光感） */}
          <circle cx={icx} cy={icy} r={ir} fill={`url(#${gradEye})`} />
          {/* 上部の明るいハイライトで艶 */}
          <ellipse cx={icx} cy={icy - ir * 0.42} rx={ir * 0.74} ry={ir * 0.46} fill={iris.top} opacity={0.55} />
          {/* 外周リング（細め） */}
          <circle cx={icx} cy={icy} r={ir} fill="none" stroke={iris.rim} strokeWidth={ir * 0.1} />
          {/* 瞳孔 */}
          {pupilShape(pheno.pupilType, icx, icy, ir)}
          {/* キャッチライト（光源は上左に固定でツヤ感を統一） */}
          <circle cx={icx - ir * 0.32} cy={icy - ir * 0.38} r={ir * 0.36} fill="#fff" />
          <circle cx={icx + ir * 0.3} cy={icy + ir * 0.36} r={ir * 0.16} fill="#fff" opacity={0.85} />
          {/* 上まぶたの落ち影で立体感 */}
          {!sclera.dark && <path d={`M ${mx - ew * 0.55} ${ey - eh * 0.55} h ${ew * 1.1} v ${eh * 0.28} q ${-ew * 0.55} ${eh * 0.16} ${-ew * 1.1} 0 Z`} fill="#000" opacity={0.1} />}
        </g>

        {/* 上まぶたライン＋まつげ */}
        <path d={`M ${mx - ew * 0.5} ${ey + shape.inner * eh} C ${mx - ew * 0.3} ${ey - eh * (shape.topH - 0.04)}, ${mx + ew * 0.3} ${ey - eh * (shape.topH - 0.04)}, ${mx + ew * 0.5} ${yo}`}
          fill="none" stroke={LID} strokeWidth={pheno.eyeMark === 'liner' ? 3.4 : 2.4} strokeLinecap="round" />
        {lashCount > 0 && <Lashes xo={xo} yo={yo} flip={flip} len={lashLen} count={lashCount} />}
        {pheno.lashType === 'both' && (
          <path d={`M ${mx - ew * 0.34} ${ey + eh * (shape.botH - 0.02)} q ${ew * 0.34} ${eh * 0.16} ${ew * 0.68} 0`} fill="none" stroke={LID} strokeWidth={1.6} strokeLinecap="round" opacity={0.8} />
        )}

        {/* めもとマーク（前面） */}
        {pheno.eyeMark === 'liner' && <path d={`M ${xo} ${yo} l ${flip * 7} ${-5} l ${-flip * 2} ${5}`} fill={LID} />}
        {pheno.eyeMark === 'tear' && <circle cx={xo + flip * 2} cy={yo + eh * 0.55} r={1.7} fill={LID} />}
        {pheno.eyeMark === 'under' && <path d={`M ${mx - ew * 0.36} ${ey + eh * 0.62} q ${ew * 0.36} ${eh * 0.2} ${ew * 0.72} 0`} fill="none" stroke={LID} strokeWidth={1.4} strokeLinecap="round" opacity={0.55} />}
      </g>
    );
  };
  return <g className="gn-eyes">{eye(cx - dx, -1, 'L')}{eye(cx + dx, 1, 'R')}</g>;
}

function mixHexLocal(a: string, b: string, t: number) { return mixHex(a, b, t); }

// ───────────────────────── くち ─────────────────────────
function Mouth({ pheno, geom, mood }: { pheno: Phenotype; geom: BodyGeom; mood: Mood }) {
  const { cx, cy, ry } = geom;
  const my = cy + ry * 0.3;
  const stroke = '#8a5a58';
  const lip = '#c66f78';
  if (mood === 'sad') return <path d={`M ${cx - 8} ${my + 3} q 8 -7 16 0`} fill="none" stroke={stroke} strokeWidth={2.4} strokeLinecap="round" />;
  if (mood === 'hungry') return <ellipse cx={cx} cy={my + 1} rx={5} ry={5.5} fill="#c66" stroke={stroke} strokeWidth={1.6} />;
  switch (pheno.mouthType) {
    case 'smile': return <path d={`M ${cx - 9} ${my - 1} q 9 8 18 0`} fill="none" stroke={stroke} strokeWidth={2.4} strokeLinecap="round" />;
    case 'smol': return <path d={`M ${cx - 3.5} ${my} q 3.5 3 7 0`} fill="none" stroke={stroke} strokeWidth={2.4} strokeLinecap="round" />;
    case 'cat': return <path d={`M ${cx - 10} ${my} q 5 6 10 0 q 5 6 10 0`} fill="none" stroke={stroke} strokeWidth={2.2} strokeLinecap="round" />;
    case 'smirk': return <path d={`M ${cx - 8} ${my} q 9 7 16 -3`} fill="none" stroke={stroke} strokeWidth={2.4} strokeLinecap="round" />;
    case 'grin':
      return (
        <g>
          <path d={`M ${cx - 11} ${my - 2} q 11 12 22 0 q -11 5 -22 0 Z`} fill="#9c4a52" stroke={stroke} strokeWidth={1.8} strokeLinejoin="round" />
          <path d={`M ${cx - 9} ${my - 1} q 9 4 18 0`} fill="#fff" />
        </g>
      );
    case 'omouth': return <ellipse cx={cx} cy={my + 1} rx={5} ry={6} fill="#c66f78" stroke={stroke} strokeWidth={1.8} />;
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
          <path d={`M ${cx - 4} ${my + 1} l 2 5 l 2 -5 Z`} fill="#fff" stroke={stroke} strokeWidth={0.7} />
        </g>
      );
    case 'beak': return <path d={`M ${cx - 6} ${my - 2} L ${cx + 6} ${my - 2} L ${cx} ${my + 6} Z`} fill="#f4b24a" stroke="#cc8a2a" strokeWidth={1.4} strokeLinejoin="round" />;
    default: void lip; return null;
  }
}

// ───────────────────────── おなか・もよう ─────────────────────────
function Belly({ geom, light }: { geom: BodyGeom; light: string }) {
  const { cx, cy, rx, ry } = geom;
  return <ellipse cx={cx} cy={cy + ry * 0.36} rx={rx * 0.5} ry={ry * 0.46} fill={light} opacity={0.4} />;
}

function Pattern({ pheno, geom, accent, light, shadow }: { pheno: Phenotype; geom: BodyGeom; accent: string; light: string; shadow: string }) {
  const { cx, cy, rx, ry } = geom;
  switch (pheno.pattern) {
    case 'belly':
      return <ellipse cx={cx} cy={cy + ry * 0.32} rx={rx * 0.58} ry={ry * 0.52} fill={light} opacity={0.85} />;
    case 'spots':
      return <g fill={accent} opacity={0.85}>{[[-0.45,-0.3,7],[0.4,-0.1,6],[-0.2,0.42,8],[0.32,0.46,6],[0.05,-0.45,5],[-0.5,0.12,5]].map(([fx,fy,r],i)=><circle key={i} cx={cx+rx*fx} cy={cy+ry*fy} r={r as number} />)}</g>;
    case 'patch':
      return <g fill={accent} opacity={0.7}><path d={smoothClosedPath([{x:cx+rx*0.12,y:cy-ry*0.6},{x:cx+rx*0.72,y:cy-ry*0.18},{x:cx+rx*0.5,y:cy+ry*0.5},{x:cx-rx*0.08,y:cy+ry*0.2}])} /></g>;
    case 'dapple':
      return <g fill={accent} opacity={0.6}>{[[-0.4,-0.4,9],[0.3,-0.3,7],[0.45,0.2,8],[-0.3,0.35,7],[0.05,0.05,6],[-0.5,0,5],[0.2,0.5,6]].map(([fx,fy,r],i)=><ellipse key={i} cx={cx+rx*fx} cy={cy+ry*fy} rx={r as number} ry={(r as number)*0.8} />)}</g>;
    case 'cow':
      return <g fill={shadow} opacity={0.8}>
        <path d={smoothClosedPath([{x:cx-rx*0.5,y:cy-ry*0.4},{x:cx-rx*0.1,y:cy-ry*0.5},{x:cx-rx*0.2,y:cy-ry*0.05},{x:cx-rx*0.55,y:cy-ry*0.02}])} />
        <path d={smoothClosedPath([{x:cx+rx*0.2,y:cy+ry*0.1},{x:cx+rx*0.6,y:cy+ry*0.2},{x:cx+rx*0.5,y:cy+ry*0.6},{x:cx+rx*0.15,y:cy+ry*0.5}])} />
      </g>;
    case 'tiger':
      return <g stroke={shadow} strokeWidth={4} opacity={0.5} strokeLinecap="round" fill="none">{[-0.45,-0.2,0.05,0.3].map((f,i)=><path key={i} d={`M ${cx+rx*(0.5-0.04*i)} ${cy+ry*f-6} q ${-rx*0.3} ${4} ${-rx*0.5} ${2}`} />)}{[-0.45,-0.2,0.05,0.3].map((f,i)=><path key={'r'+i} d={`M ${cx-rx*(0.5-0.04*i)} ${cy+ry*f-6} q ${rx*0.3} ${4} ${rx*0.5} ${2}`} />)}</g>;
    case 'stripes':
      return <g stroke={accent} strokeWidth={6} opacity={0.55} strokeLinecap="round">{[-0.5,-0.2,0.1,0.4].map((f,i)=><line key={i} x1={cx-rx} y1={cy+ry*f} x2={cx+rx} y2={cy+ry*f+8} />)}</g>;
    case 'socks':
      return <g fill={light} opacity={0.85}>
        <path d={`M ${cx-rx*0.7} ${cy+ry*0.55} a ${rx*0.7} ${ry*0.7} 0 0 0 ${rx*1.4} 0 v ${ry*0.5} h ${-rx*1.4} Z`} />
      </g>;
    case 'freckle':
      return <g fill={accent} opacity={0.7}>{[[-0.5,0.05],[-0.42,0.16],[-0.34,0.06],[0.5,0.05],[0.42,0.16],[0.34,0.06]].map(([fx,fy],i)=><circle key={i} cx={cx+rx*fx} cy={cy+ry*fy} r={2} />)}</g>;
    case 'starmark':
      return <path d={starPath(cx, cy - ry * 0.3, 12, 12)} fill={accent} opacity={0.9} />;
    case 'heartmark':
      return <path d={heartPath(cx, cy - ry * 0.34, 12)} fill={accent} opacity={0.9} />;
    case 'galaxy':
      return <g>
        <ellipse cx={cx} cy={cy+ry*0.1} rx={rx*0.85} ry={ry*0.8} fill="#3a2d6b" opacity={0.55} />
        {[[-0.4,-0.2],[0.3,0.1],[0.1,0.4],[-0.2,0.3],[0.45,-0.25],[-0.45,0.15],[0,-0.1]].map(([fx,fy],i)=><path key={i} d={starPath(cx+rx*fx, cy+ry*fy, 3.5, 3.5)} fill="#fff6d0" opacity={0.9} />)}
      </g>;
    default:
      return null;
  }
}

// ───────────────────────── みみ ─────────────────────────
function Ears({ type, geom, pal }: { type: string; geom: BodyGeom; pal: Palette }) {
  const { cx, cy, rx, ry } = geom;
  const topY = cy - ry * 0.76;
  const dx = rx * 0.56;
  const inner = mixHex(pal.light, '#ff9dbf', 0.35);
  const stroke = pal.outline;
  const ear = (mx: number, flip: number) => {
    switch (type) {
      case 'cat':
        return <g key={mx}>
          <path d={`M ${mx} ${topY + 16} L ${mx + flip * 15} ${topY - 28} L ${mx + flip * 31} ${topY + 6} Z`} fill={pal.base} stroke={stroke} strokeWidth={2.4} strokeLinejoin="round" />
          <path d={`M ${mx + flip * 6} ${topY + 8} L ${mx + flip * 15} ${topY - 15} L ${mx + flip * 24} ${topY + 4} Z`} fill={inner} />
        </g>;
      case 'fox':
        return <g key={mx}>
          <path d={`M ${mx - flip * 2} ${topY + 14} L ${mx + flip * 20} ${topY - 32} L ${mx + flip * 34} ${topY + 4} Z`} fill={pal.base} stroke={stroke} strokeWidth={2.2} strokeLinejoin="round" />
          <path d={`M ${mx + flip * 6} ${topY + 6} L ${mx + flip * 19} ${topY - 18} L ${mx + flip * 26} ${topY + 2} Z`} fill={inner} />
        </g>;
      case 'round':
        return <g key={mx}><circle cx={mx + flip * 8} cy={topY - 6} r={16} fill={pal.base} stroke={stroke} strokeWidth={2.4} /><circle cx={mx + flip * 8} cy={topY - 4} r={9} fill={inner} /></g>;
      case 'fluffy':
        return <g key={mx} fill={pal.base} stroke={stroke} strokeWidth={2}>
          <circle cx={mx + flip * 6} cy={topY - 4} r={13} /><circle cx={mx + flip * 17} cy={topY + 2} r={9} /><circle cx={mx - flip * 4} cy={topY + 4} r={9} />
        </g>;
      case 'tuft':
        return <g key={mx}>
          <path d={`M ${mx} ${topY + 14} q ${flip * 4} ${-30} ${flip * 16} ${-34} q ${-flip * 3} ${14} ${flip * 2} ${24} Z`} fill={pal.base} stroke={stroke} strokeWidth={2} strokeLinejoin="round" />
        </g>;
      case 'bunny':
        return <g key={mx}>
          <ellipse cx={mx + flip * 8} cy={topY - 22} rx={9} ry={28} fill={pal.base} stroke={stroke} strokeWidth={2.4} transform={`rotate(${flip * 12} ${mx + flip * 8} ${topY - 22})`} />
          <ellipse cx={mx + flip * 8} cy={topY - 22} rx={4} ry={20} fill={inner} transform={`rotate(${flip * 12} ${mx + flip * 8} ${topY - 22})`} />
        </g>;
      case 'floppy':
        return <ellipse key={mx} cx={mx + flip * 16} cy={topY + 18} rx={11} ry={23} fill={pal.base} stroke={stroke} strokeWidth={2.4} transform={`rotate(${flip * 40} ${mx + flip * 16} ${topY + 18})`} />;
      case 'fin':
        return <path key={mx} d={`M ${mx} ${topY + 20} q ${flip * 26} ${-12} ${flip * 22} ${22} q ${-flip * 10} ${-6} ${-flip * 22} ${-2} Z`} fill={mixHex(pal.base, '#7fd0ec', 0.5)} opacity={0.9} stroke={stroke} strokeWidth={1.6} />;
      case 'antenna':
        return <g key={mx}>
          <path d={`M ${mx} ${topY + 10} q ${flip * 6} ${-22} ${flip * 14} ${-30}`} fill="none" stroke={stroke} strokeWidth={2.4} strokeLinecap="round" />
          <circle cx={mx + flip * 14} cy={topY - 20} r={6} fill={pal.accent} stroke={stroke} strokeWidth={1.6} className="gn-glow" />
        </g>;
      default: return null;
    }
  };
  return <g>{ear(cx - dx, -1)}{ear(cx + dx, 1)}</g>;
}

// ───────────────────────── てあし ─────────────────────────
function Limbs({ type, geom, pal, mid }: { type: string; geom: BodyGeom; pal: Palette; mid: string }) {
  const { cx, cy, rx, ry } = geom;
  const fill = mid;
  const stroke = pal.outline;
  const footY = cy + ry * 0.94;
  const armY = cy + ry * 0.45;
  const armX = rx * 0.82;
  const foot = (mx: number, flip: number) => {
    if (type === 'paw') return <g key={'f'+mx}>
      <ellipse cx={mx} cy={footY} rx={13} ry={9} fill={fill} stroke={stroke} strokeWidth={2.2} />
      <g stroke={pal.outline} strokeWidth={1.2} opacity={0.6}><line x1={mx-4} y1={footY+5} x2={mx-4} y2={footY+8} /><line x1={mx} y1={footY+6} x2={mx} y2={footY+9} /><line x1={mx+4} y1={footY+5} x2={mx+4} y2={footY+8} /></g>
    </g>;
    void flip;
    return <ellipse key={'f'+mx} cx={mx} cy={footY} rx={type==='foot'?13:10} ry={type==='foot'?8:7} fill={fill} stroke={stroke} strokeWidth={2.2} />;
  };
  const arm = (mx: number, flip: number) => <ellipse key={'a'+mx} cx={mx} cy={armY} rx={8} ry={11} fill={fill} stroke={stroke} strokeWidth={2.2} transform={`rotate(${flip*18} ${mx} ${armY})`} />;
  const showFeet = type === 'paw' || type === 'foot' || type === 'stub';
  const showArms = type === 'nub' || type === 'paw' || type === 'stub';
  return <g>
    {showArms && <>{arm(cx - armX, -1)}{arm(cx + armX, 1)}</>}
    {showFeet && <>{foot(cx - rx * 0.4, -1)}{foot(cx + rx * 0.4, 1)}</>}
  </g>;
}

// ───────────────────────── しっぽ ─────────────────────────
function Tail({ type, geom, pal, accent }: { type: string; geom: BodyGeom; pal: Palette; accent: string }) {
  const bx = geom.cx + geom.rx * 0.72;
  const by = geom.cy + geom.ry * 0.5;
  const stroke = pal.outline;
  switch (type) {
    case 'fluffy': return <circle cx={bx + 8} cy={by} r={16} fill={pal.base} stroke={stroke} strokeWidth={2.2} />;
    case 'cat': return <path d={`M ${bx} ${by} q 26 2 26 -22 q 0 -14 -10 -18`} fill="none" stroke={pal.base} strokeWidth={9} strokeLinecap="round" />;
    case 'fox': return <g><path d={`M ${bx-4} ${by} q 30 4 34 -20 q 4 -18 -8 -26 q 6 18 -8 30 q -10 8 -18 6 Z`} fill={pal.base} stroke={stroke} strokeWidth={2.2} strokeLinejoin="round" /><path d={`M ${bx+24} ${by-30} q 8 6 6 16 q -6 4 -12 2 Z`} fill={pal.light} /></g>;
    case 'bushy': return <g fill={pal.base} stroke={stroke} strokeWidth={2}><circle cx={bx+12} cy={by-6} r={14} /><circle cx={bx+20} cy={by+6} r={12} /><circle cx={bx+6} cy={by+10} r={11} /></g>;
    case 'curl': return <path d={`M ${bx} ${by} q 24 -4 22 16 q -2 16 -18 12 q -10 -3 -6 -12`} fill="none" stroke={pal.base} strokeWidth={8} strokeLinecap="round" />;
    case 'long': return <path d={`M ${bx} ${by} q 30 6 30 -22 q 0 -16 -10 -20`} fill="none" stroke={pal.base} strokeWidth={8} strokeLinecap="round" />;
    case 'leaf': return <g transform={`rotate(28 ${bx} ${by})`}><path d={`M ${bx} ${by} q 18 -16 30 0 q -12 16 -30 0 Z`} fill="#9ed47f" stroke="#5fae5a" strokeWidth={2} /><line x1={bx+4} y1={by} x2={bx+26} y2={by} stroke="#5fae5a" strokeWidth={1.5} /></g>;
    case 'star': return <path d={starPath(bx + 14, by, 13, 13)} fill={accent} stroke={stroke} strokeWidth={2} />;
    default: return null;
  }
}

// ───────────────────────── つの ─────────────────────────
function Horns({ type, geom }: { type: string; geom: BodyGeom }) {
  const { cx, cy, ry } = geom;
  const topY = cy - ry * 0.84;
  switch (type) {
    case 'nub': return <g fill="#f4e1c1" stroke="#cda873" strokeWidth={1.8}><ellipse cx={cx-14} cy={topY} rx={6} ry={8} /><ellipse cx={cx+14} cy={topY} rx={6} ry={8} /></g>;
    case 'curl': return <g fill="none" stroke="#e7d0a8" strokeWidth={5} strokeLinecap="round"><path d={`M ${cx-15} ${topY+2} q -12 4 -10 16 q 2 8 10 6`} /><path d={`M ${cx+15} ${topY+2} q 12 4 10 16 q -2 8 -10 6`} /></g>;
    case 'unicorn': return <g><path d={`M ${cx} ${topY - 26} L ${cx - 7} ${topY + 6} L ${cx + 7} ${topY + 6} Z`} fill="#ffe9a8" stroke="#d8b45c" strokeWidth={2} strokeLinejoin="round" /><path d={`M ${cx-3} ${topY-18} l 6 0`} stroke="#d8b45c" strokeWidth={1.4} /></g>;
    case 'devil': return <g fill="#e0726f" stroke="#a8413e" strokeWidth={1.8}><path d={`M ${cx-16} ${topY+6} q -6 -22 8 -24 q -4 12 2 22 Z`} /><path d={`M ${cx+16} ${topY+6} q 6 -22 -8 -24 q 4 12 -2 22 Z`} /></g>;
    case 'antler': return <g fill="none" stroke="#c79a63" strokeWidth={3} strokeLinecap="round"><path d={`M ${cx-12} ${topY+4} q -4 -18 -2 -24 m 0 10 q -8 -4 -12 -8 m 12 -2 q 6 -6 9 -10`} /><path d={`M ${cx+12} ${topY+4} q 4 -18 2 -24 m 0 10 q 8 -4 12 -8 m -12 -2 q -6 -6 -9 -10`} /></g>;
    default: return null;
  }
}

// ───────────────────────── ほっぺ ─────────────────────────
function Cheeks({ type, geom, uid }: { type: string; geom: BodyGeom; uid: string }) {
  const { cx, cy, rx, ry } = geom;
  const y = cy + ry * 0.2;
  const dx = rx * 0.62;
  if (type === 'none') return null;
  const gid = `blush${uid}`;
  const at = (mx: number, key: string) => {
    switch (type) {
      case 'blush': return <ellipse key={key} cx={mx} cy={y} rx={12} ry={7.5} fill={`url(#${gid})`} />;
      case 'round': return <circle key={key} cx={mx} cy={y} r={8.5} fill={`url(#${gid})`} />;
      case 'freckle': return <g key={key} fill="#d98a64" opacity={0.7}><circle cx={mx-5} cy={y} r={1.6} /><circle cx={mx} cy={y-3} r={1.6} /><circle cx={mx+5} cy={y} r={1.6} /><circle cx={mx-2} cy={y+4} r={1.6} /><circle cx={mx+4} cy={y+4} r={1.6} /></g>;
      case 'swirl': return <path key={key} d={`M ${mx} ${y} m -6 0 a 6 6 0 1 1 6 6 a 3 3 0 1 1 -3 -3`} fill="none" stroke="#ff9dbf" strokeWidth={1.8} opacity={0.75} />;
      case 'heart': return <path key={key} d={heartPath(mx, y, 6)} fill="#ff7fae" opacity={0.82} />;
      case 'star': return <path key={key} d={starPath(mx, y, 6, 6)} fill="#ffcf4a" opacity={0.9} />;
      default: return null;
    }
  };
  return <g>
    <defs><radialGradient id={gid} cx="0.5" cy="0.5" r="0.5"><stop offset="0" stopColor="#ff8fb5" stopOpacity="0.75" /><stop offset="1" stopColor="#ff8fb5" stopOpacity="0" /></radialGradient></defs>
    {at(cx - dx, 'l')}{at(cx + dx, 'r')}
  </g>;
}

// ───────────────────────── はね・オーラ ─────────────────────────
function Wings({ type, geom, pal }: { type: string; geom: BodyGeom; pal: Palette }) {
  const { cx, cy, rx } = geom;
  const wing = (flip: number) => {
    const x = cx + flip * rx * 0.84;
    const y = cy - 6;
    switch (type) {
      case 'fairy': return <g key={flip} opacity={0.82}>
        <ellipse cx={x + flip * 14} cy={y - 12} rx={18} ry={25} fill="#e3f4ff" stroke="#bfe4f5" strokeWidth={1.6} transform={`rotate(${flip * 18} ${x} ${y})`} />
        <ellipse cx={x + flip * 16} cy={y + 16} rx={13} ry={18} fill="#f0eaff" stroke="#cdd9f5" strokeWidth={1.6} transform={`rotate(${flip * 24} ${x} ${y})`} />
      </g>;
      case 'butterfly': return <g key={flip} opacity={0.85}>
        <ellipse cx={x + flip * 14} cy={y - 12} rx={19} ry={22} fill={mixHex(pal.accent, '#fff', 0.4)} stroke={pal.outline} strokeWidth={1.4} transform={`rotate(${flip * 16} ${x} ${y})`} />
        <ellipse cx={x + flip * 18} cy={y + 16} rx={14} ry={16} fill={mixHex(pal.base, '#fff', 0.5)} stroke={pal.outline} strokeWidth={1.4} transform={`rotate(${flip * 22} ${x} ${y})`} />
        <circle cx={x + flip * 14} cy={y - 12} r={4} fill={pal.accent} />
      </g>;
      case 'feather': return <path key={flip} d={`M ${x} ${y} q ${flip * 40} ${-30} ${flip * 30} ${24} q ${-flip * 16} ${6} ${-flip * 30} ${-24} Z`} fill="#fff" stroke={pal.shadow} strokeWidth={1.8} opacity={0.94} />;
      case 'bat': return <path key={flip} d={`M ${x} ${y - 10} q ${flip * 36} ${-8} ${flip * 40} ${20} l ${-flip * 12} ${-4} l ${-flip * 4} ${12} l ${-flip * 10} ${-8} l ${-flip * 6} ${8} Z`} fill={pal.shadow} stroke={pal.outline} strokeWidth={1.6} />;
      case 'bee': return <ellipse key={flip} cx={x + flip * 12} cy={y - 6} rx={13} ry={18} fill="#fffde0" stroke="#e8dca0" strokeWidth={1.4} opacity={0.72} transform={`rotate(${flip * 20} ${x} ${y})`} />;
      default: return null;
    }
  };
  return <g className="gn-wing">{wing(-1)}{wing(1)}</g>;
}

function AuraBack({ uid, aura, geom }: { uid: string; aura: string; geom: BodyGeom }) {
  if (aura === 'glow') return <ellipse cx={geom.cx} cy={geom.cy} rx={geom.rx * 1.35} ry={geom.ry * 1.35} fill="#fff6c8" opacity={0.5} className="gn-glow" />;
  if (aura === 'rainbow') return <ellipse cx={geom.cx} cy={geom.cy} rx={geom.rx * 1.32} ry={geom.ry * 1.32} fill={`url(#aura-${uid})`} opacity={0.42} className="gn-glow" />;
  if (aura === 'starfield') return <ellipse cx={geom.cx} cy={geom.cy} rx={geom.rx * 1.3} ry={geom.ry * 1.3} fill="#3a2d6b" opacity={0.32} className="gn-glow" />;
  return null;
}

function AuraFront({ aura, geom, animate }: { aura: string; geom: BodyGeom; animate: boolean }) {
  const cls = animate ? 'gn-sparkle' : '';
  const spots = [
    { x: geom.cx - geom.rx * 0.9, y: geom.cy - geom.ry * 0.7, r: 5, d: '0s' },
    { x: geom.cx + geom.rx * 0.95, y: geom.cy - geom.ry * 0.2, r: 4, d: '0.5s' },
    { x: geom.cx + geom.rx * 0.7, y: geom.cy + geom.ry * 0.7, r: 5, d: '1s' },
    { x: geom.cx - geom.rx * 0.7, y: geom.cy + geom.ry * 0.5, r: 3.5, d: '1.4s' },
  ];
  if (aura === 'none') return null;
  const color = aura === 'starfield' ? '#fff6d0' : aura === 'rainbow' ? '#fff' : '#fff3b0';
  return <g>{spots.map((s, i) => <path key={i} d={starPath(s.x, s.y, s.r, s.r)} fill={color} className={cls} style={{ animationDelay: s.d }} />)}</g>;
}

function heartPath(cx: number, cy: number, s: number): string {
  return `M ${cx} ${cy + s * 0.8} C ${cx - s * 1.4} ${cy - s * 0.4}, ${cx - s * 0.6} ${cy - s * 1.1}, ${cx} ${cy - s * 0.3} C ${cx + s * 0.6} ${cy - s * 1.1}, ${cx + s * 1.4} ${cy - s * 0.4}, ${cx} ${cy + s * 0.8} Z`;
}

export { roundedRect };
