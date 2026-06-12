import { useGame } from '../game/store';
import { useToast } from './common';

export default function EggScreen() {
  const eggs = useGame((s) => s.eggs);
  const warmEgg = useGame((s) => s.warmEgg);
  const show = useToast((s) => s.show);

  const onWarm = (id: string) => {
    const before = useGame.getState().eggs.find((e) => e.id === id)?.warmth ?? 0;
    warmEgg(id);
    const stillThere = useGame.getState().eggs.find((e) => e.id === id);
    if (!stillThere) show('ふ化したよ！🐣✨');
    else show(before + 26 >= 100 ? 'もうすぐ…！' : 'あたたかい♨️');
  };

  if (eggs.length === 0) {
    return (
      <div className="screen">
        <div className="screen-title">たまご・ふ化き</div>
        <div className="empty">いまは たまごが ないよ。<br />「こうはい」で たまごを うもう🥚💕</div>
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="screen-title">たまご・ふ化き（{eggs.length}こ）</div>
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="muted center">たまごを タップして あたためよう。<br />4かい くらいで ふ化するよ🐣</div>
      </div>
      <div className="egg-grid">
        {eggs.map((e) => (
          <div className="egg-card" key={e.id} onClick={() => onWarm(e.id)}>
            <div className="egg-emoji">{e.warmth >= 75 ? '🐣' : '🥚'}</div>
            <div className="bar" style={{ marginTop: 8 }}>
              <div style={{ width: `${e.warmth}%`, background: 'var(--gold)' }} />
            </div>
            <div className="muted" style={{ fontSize: 9, marginTop: 5 }}>
              {e.parents ? `${e.generation}世代のたまご` : 'はじまりのたまご'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
