import { useState } from 'react';
import { useGame, BREED_COST } from '../game/store';
import GenomonView from '../render/GenomonView';
import { Genomon, STAGE_LABEL } from '../game/types';
import { Genome } from '../genetics/genome';
import { GENES, alleleLabel, isRareAllele } from '../genetics/genes';
import { RarityOf, useToast } from './common';

// ゲノムが保有するレア対立遺伝子（発現・劣性問わず）のラベル一覧
function carriedRares(genome: Genome): string[] {
  const out: string[] = [];
  for (const g of GENES) {
    if (g.kind !== 'discrete') continue;
    const seen = new Set<string>();
    for (const al of genome.discrete[g.key] ?? []) {
      if (isRareAllele(g.key, al) && !seen.has(al)) {
        seen.add(al);
        out.push(alleleLabel(g.key, al));
      }
    }
  }
  return out;
}

function ParentSlot({ g, onClear }: { g: Genomon | null; onClear: () => void }) {
  if (!g) return <div className="pick-slot"><span className="muted">タップで えらぶ</span></div>;
  const rares = carriedRares(g.genome);
  return (
    <div className="pick-slot filled" onClick={onClear}>
      <GenomonView genome={g.genome} size={84} animate={false} />
      <div className="mon-name" style={{ fontSize: 12, fontWeight: 800 }}>{g.name}</div>
      <RarityOf genome={g.genome} />
      {g.mutagen && <div className="muted" style={{ color: '#7bbf57', fontSize: 9 }}>🧪変異促進中</div>}
      {rares.length > 0 && <div className="muted" style={{ fontSize: 9 }}>保因: {rares.join('・')}</div>}
    </div>
  );
}

export default function BreedScreen() {
  const genomons = useGame((s) => s.genomons);
  const coins = useGame((s) => s.coins);
  const breedPair = useGame((s) => s.breedPair);
  const show = useToast((s) => s.show);
  const [a, setA] = useState<string | null>(null);
  const [b, setB] = useState<string | null>(null);

  const eligible = genomons.filter((g) => g.stage === 'adult' || g.stage === 'elder');
  const pa = genomons.find((g) => g.id === a) ?? null;
  const pb = genomons.find((g) => g.id === b) ?? null;

  const choose = (id: string) => {
    if (a === id) return setA(null);
    if (b === id) return setB(null);
    if (!a) return setA(id);
    if (!b) return setB(id);
    setB(id);
  };

  const canBreed = pa && pb && pa.id !== pb.id && coins >= BREED_COST;

  const onBreed = () => {
    if (!pa || !pb) return;
    const n = breedPair(pa.id, pb.id);
    if (n > 0) { show(`たまごが ${n}こ うまれた！🥚`); setA(null); setB(null); }
    else show('交配できないよ…');
  };

  if (eligible.length < 2) {
    return (
      <div className="screen">
        <div className="screen-title">こうはい</div>
        <div className="empty">
          交配には「おとな」が 2ひき いるよ。<br />
          ゲノモンを そだてて おとなに しよう🌱<br />
          <span style={{ fontSize: 11 }}>（いま おとな: {eligible.length}ひき）</span>
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="screen-title">こうはい — ふたりを えらんでね</div>
      <div className="card">
        <div className="pick-row">
          <ParentSlot g={pa} onClear={() => setA(null)} />
          <span className="heart-mid">💞</span>
          <ParentSlot g={pb} onClear={() => setB(null)} />
        </div>
        <button className="btn" style={{ marginTop: 14 }} disabled={!canBreed} onClick={onBreed}>
          {coins < BREED_COST ? `コインが たりない（${BREED_COST}🪙）` : `交配する（${BREED_COST}🪙）`}
        </button>
        <div className="muted center" style={{ marginTop: 8, fontSize: 11 }}>
          1〜3こ たまごが うまれるよ。<br />レア形質は 劣性で 隠れていることも…！🔬
        </div>
      </div>

      <div className="screen-title" style={{ marginTop: 18 }}>おとなの ゲノモン</div>
      <div className="grid">
        {eligible.map((g) => {
          const selected = g.id === a || g.id === b;
          return (
            <div key={g.id} className={`mon-card ${selected ? 'is-active' : ''}`} onClick={() => choose(g.id)}>
              <span className="gen">G{g.generation}</span>
              <div className="thumb"><GenomonView genome={g.genome} size={72} animate={false} /></div>
              <div className="mon-name">{selected ? '✓ ' : ''}{g.name}</div>
              <div className="muted" style={{ fontSize: 9 }}>{STAGE_LABEL[g.stage]}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
