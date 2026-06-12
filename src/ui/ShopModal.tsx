import { useGame, SHOP } from '../game/store';
import { Inventory } from '../game/types';
import { useToast } from './common';

const ITEMS: { kind: keyof Inventory; icon: string }[] = [
  { kind: 'gochiso', icon: '🍰' },
  { kind: 'mutagen', icon: '🧪' },
  { kind: 'lens', icon: '🔬' },
];

export default function ShopModal({ onClose }: { onClose: () => void }) {
  const coins = useGame((s) => s.coins);
  const inventory = useGame((s) => s.inventory);
  const buy = useGame((s) => s.buy);
  const show = useToast((s) => s.show);

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-handle" />
        <div className="name-row"><h2>🛒 おみせ</h2></div>
        <div className="center muted" style={{ marginBottom: 14 }}>もちコイン {coins} 🪙</div>

        {ITEMS.map(({ kind, icon }) => {
          const item = SHOP[kind];
          const owned = inventory[kind];
          const afford = coins >= item.cost;
          return (
            <div className="card" key={kind} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, marginBottom: 10 }}>
              <div style={{ fontSize: 32 }}>{icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800 }}>{item.label} <span className="muted">×{owned}</span></div>
                <div className="muted" style={{ fontSize: 11 }}>{item.desc}</div>
              </div>
              <button className="btn sm" disabled={!afford}
                onClick={() => { buy(kind); show(`${item.label}を かった！`); }}>
                {item.cost}🪙
              </button>
            </div>
          );
        })}

        <div className="muted center" style={{ fontSize: 11, marginTop: 6 }}>
          コインは お世話・ふ化・レアふ化で たまるよ💰
        </div>
        <button className="btn" style={{ marginTop: 14 }} onClick={onClose}>とじる</button>
      </div>
    </div>
  );
}
