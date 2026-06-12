import { create } from 'zustand';
import { computeRarity, RarityTier, TIER_COLOR, Genome } from '../genetics/genome';
import { Stats } from '../game/types';

// ── トースト ──
interface ToastState { msg: string | null; show: (m: string) => void; }
export const useToast = create<ToastState>((set) => ({
  msg: null,
  show: (m) => {
    set({ msg: m });
    setTimeout(() => set((s) => (s.msg === m ? { msg: null } : s)), 1800);
  },
}));

export function Toast() {
  const msg = useToast((s) => s.msg);
  if (!msg) return null;
  return <div className="toast">{msg}</div>;
}

// ── レアリティバッジ ──
export function TierBadge({ tier, score }: { tier: RarityTier; score?: number }) {
  return (
    <span className="tier" style={{ background: TIER_COLOR[tier] }}>
      {tier === 'ミシック' ? '✦ ' : ''}{tier}{score != null ? ` ${score}` : ''}
    </span>
  );
}

export function RarityOf({ genome }: { genome: Genome }) {
  const r = computeRarity(genome);
  return <TierBadge tier={r.tier} score={r.score} />;
}

// ── ステータスバー ──
const STAT_META: { key: keyof Stats; label: string; color: string; icon: string }[] = [
  { key: 'hunger', label: 'まんぷく', color: '#ffb04a', icon: '🍙' },
  { key: 'happy', label: 'きげん', color: '#ff7eb3', icon: '💕' },
  { key: 'energy', label: 'げんき', color: '#5ec7e0', icon: '⚡' },
  { key: 'clean', label: 'きれい', color: '#8fdcb6', icon: '🫧' },
  { key: 'bond', label: 'なつき', color: '#c69bf0', icon: '🌟' },
];

export function StatBars({ stats }: { stats: Stats }) {
  return (
    <div>
      {STAT_META.map((m) => (
        <div className="stat" key={m.key}>
          <div className="stat-head">
            <span>{m.icon} {m.label}</span>
            <span>{Math.round(stats[m.key])}</span>
          </div>
          <div className="bar">
            <div style={{ width: `${stats[m.key]}%`, background: m.color }} />
          </div>
        </div>
      ))}
    </div>
  );
}
