import { useGame } from '../game/store';
import { Genomon, STAGE_LABEL } from '../game/types';
import GenomonView, { Mood } from '../render/GenomonView';
import { expressGenome } from '../genetics/genome';
import { alleleLabel } from '../genetics/genes';
import { StatBars, RarityOf, useToast } from './common';

export function moodFor(g: Genomon): Mood {
  const s = g.stats;
  if (s.hunger < 22) return 'hungry';
  if (s.energy < 20) return 'sleep';
  if (s.happy < 28 || s.clean < 22) return 'sad';
  return 'happy';
}

function statusText(g: Genomon): string {
  const m = moodFor(g);
  const temper = alleleLabel('temperament', expressGenome(g.genome).temperament);
  if (m === 'hungry') return 'おなかすいた〜！ごはんちょうだい';
  if (m === 'sleep') return 'ねむい…zzz';
  if (m === 'sad') return g.stats.clean < 22 ? 'おそうじしてほしいな…' : 'かまってほしいよ〜';
  const lines = ['ごきげん♪', 'あそぼ〜！', `${temper}な きぶん`, 'だいすき！', 'ぷにぷに〜'];
  return lines[Math.floor((g.id.charCodeAt(0) + Math.floor(g.stats.bond)) % lines.length)];
}

export default function HomeScreen({ onOpenDetail }: { onOpenDetail: (id: string) => void }) {
  const genomons = useGame((s) => s.genomons);
  const activeId = useGame((s) => s.activeId);
  const inventory = useGame((s) => s.inventory);
  const { feed, play, clean, rest, pet } = useGame.getState();
  const show = useToast((s) => s.show);

  const active = genomons.find((g) => g.id === activeId) ?? genomons[0];

  if (!active) {
    return (
      <div className="screen">
        <div className="empty">
          まだゲノモンがいないよ🥚<br />
          「たまご」タブで たまごを あたためて<br />ふ化させよう！
        </div>
      </div>
    );
  }

  const mood = moodFor(active);
  const care = (fn: () => void, msg: string) => () => { fn(); show(msg); };

  return (
    <div className="screen">
      <div className="card" style={{ padding: 12 }}>
        <div className="stage-wrap">
          <div className="stage-bg">
            <GenomonView genome={active.genome} size={240} mood={mood} className="stage-genomon" />
          </div>
        </div>
        <div className="name-row">
          <h2>{active.name}</h2>
          <RarityOf genome={active.genome} />
        </div>
        <div className="center muted">
          {STAGE_LABEL[active.stage]}・{active.generation}世代・なつき{Math.round(active.stats.bond)}
        </div>
        <div className="center" style={{ marginTop: 8, fontWeight: 800, color: 'var(--pink-deep)' }}>
          「{statusText(active)}」
        </div>
      </div>

      <div className="card">
        <StatBars stats={active.stats} />
        <div className="care-grid">
          <button className="care-btn" onClick={care(() => feed(active.id, 'normal'), 'もぐもぐ🍙')}>
            <span className="ci">🍙</span>ごはん
          </button>
          <button className="care-btn" disabled={inventory.gochiso <= 0} onClick={care(() => feed(active.id, 'gochiso'), 'おいし〜！🍰')}>
            <span className="ci">🍰</span>ごちそう{inventory.gochiso > 0 ? `(${inventory.gochiso})` : ''}
          </button>
          <button className="care-btn" onClick={care(() => play(active.id), 'たのし〜！🎈')}>
            <span className="ci">🎈</span>あそぶ
          </button>
          <button className="care-btn" onClick={care(() => clean(active.id), 'ぴかぴか🫧')}>
            <span className="ci">🫧</span>おそうじ
          </button>
          <button className="care-btn" onClick={care(() => pet(active.id), 'うれしいな♪')}>
            <span className="ci">🫶</span>なでる
          </button>
          <button className="care-btn" onClick={care(() => rest(active.id), 'おやすみ…zzz')}>
            <span className="ci">🛏️</span>ねんね
          </button>
        </div>
        <button className="btn ghost sm" style={{ width: '100%', marginTop: 12 }} onClick={() => onOpenDetail(active.id)}>
          🔬 ゲノムをみる
        </button>
      </div>
    </div>
  );
}
