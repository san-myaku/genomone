import { useGame } from '../game/store';
import GenomonView from '../render/GenomonView';
import { computeRarity, TIER_COLOR } from '../genetics/genome';
import { STAGE_LABEL } from '../game/types';

export default function RanchScreen({ onOpenDetail }: { onOpenDetail: (id: string) => void }) {
  const genomons = useGame((s) => s.genomons);
  const activeId = useGame((s) => s.activeId);

  if (genomons.length === 0) {
    return <div className="screen"><div className="empty">まだ なかまが いないよ。<br />たまごを ふ化させよう🥚</div></div>;
  }

  const sorted = [...genomons].sort((a, b) => {
    const ra = computeRarity(a.genome).score;
    const rb = computeRarity(b.genome).score;
    return rb - ra || b.generation - a.generation;
  });

  return (
    <div className="screen">
      <div className="screen-title">ぼくじょうの なかま（{genomons.length}ひき）</div>
      <div className="grid">
        {sorted.map((g) => {
          const r = computeRarity(g.genome);
          return (
            <div
              key={g.id}
              className={`mon-card ${g.id === activeId ? 'is-active' : ''}`}
              onClick={() => onOpenDetail(g.id)}
            >
              <span className="corner" title="レアリティ" style={{ color: TIER_COLOR[r.tier] }}>●</span>
              <span className="gen">G{g.generation}</span>
              <div className="thumb">
                <GenomonView genome={g.genome} size={78} animate={false} />
              </div>
              <div className="mon-name">{g.id === activeId ? '★' : ''}{g.name}</div>
              <div className="muted" style={{ fontSize: 9 }}>{STAGE_LABEL[g.stage]}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
