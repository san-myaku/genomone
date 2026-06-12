import { useState } from 'react';
import { useGame } from '../game/store';
import GenomonView from '../render/GenomonView';
import { STAGE_LABEL } from '../game/types';
import { expressGenome, computeRarity, GENE_MAP } from '../genetics/genome';
import { GENES, DiscreteGene, AdditiveGene, alleleLabel, isRareAllele } from '../genetics/genes';
import { StatBars, RarityOf, useToast } from './common';

export default function DetailModal({ id, onClose }: { id: string; onClose: () => void }) {
  const genomons = useGame((s) => s.genomons);
  const activeId = useGame((s) => s.activeId);
  const inventory = useGame((s) => s.inventory);
  const { setActive, rename, applyLens, applyMutagen, release } = useGame.getState();
  const show = useToast((s) => s.show);
  const [confirmRelease, setConfirmRelease] = useState(false);

  const g = genomons.find((x) => x.id === id);
  if (!g) return null;

  const pheno = expressGenome(g.genome);
  const rarity = computeRarity(g.genome);
  const parentNames = g.parents?.map((pid) => genomons.find((x) => x.id === pid)?.name ?? '？？') ?? null;

  const onRename = () => {
    const name = window.prompt('あたらしい なまえ（12文字まで）', g.name);
    if (name != null) rename(g.id, name.trim());
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-handle" />

        <div className="center">
          <div className="stage-bg" style={{ aspectRatio: '1 / 0.7', maxWidth: 260, margin: '0 auto' }}>
            <GenomonView genome={g.genome} size={220} mood="happy" />
          </div>
          <div className="name-row">
            <h2>{g.name}</h2>
            <RarityOf genome={g.genome} />
          </div>
          <div className="muted">
            {STAGE_LABEL[g.stage]}・{g.generation}世代・{Math.floor(g.ageDays)}日齢
            {rarity.hiddenRares > 0 && g.lensed && <>・隠れレア{rarity.hiddenRares}</>}
          </div>
          {parentNames && <div className="muted" style={{ fontSize: 11, marginTop: 3 }}>おや: {parentNames.join(' × ')}</div>}
        </div>

        {/* アクション */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '14px 0' }}>
          {g.id !== activeId && (
            <button className="btn ghost sm" onClick={() => { setActive(g.id); show('ホームに せっていしたよ★'); }}>★ ホームに</button>
          )}
          <button className="btn ghost sm" onClick={onRename}>✏️ なまえ</button>
          <button className="btn ghost sm" disabled={inventory.lens <= 0 || g.lensed}
            onClick={() => { applyLens(g.id); show('隠れ遺伝子が みえた！🔬'); }}>
            🔬 レンズ{inventory.lens > 0 ? `(${inventory.lens})` : ''}
          </button>
          <button className="btn ghost sm" disabled={inventory.mutagen <= 0 || g.mutagen}
            onClick={() => { applyMutagen(g.id); show('次の交配で 変異率アップ🧪'); }}>
            🧪 変異促進{inventory.mutagen > 0 ? `(${inventory.mutagen})` : ''}
          </button>
        </div>

        <div className="card" style={{ padding: 12 }}>
          <StatBars stats={g.stats} />
        </div>

        {/* ゲノム */}
        <div className="screen-title" style={{ marginTop: 16 }}>🧬 ゲノム（{g.lensed ? '解析ずみ' : 'レンズで劣性をみる'}）</div>
        {GENES.filter((x): x is DiscreteGene => x.kind === 'discrete').map((gene) => {
          const locus = g.genome.discrete[gene.key] ?? ['?', '?'];
          const expressed = pheno[gene.key as keyof typeof pheno] as string;
          return (
            <div className="gene-card" key={gene.key}>
              <div className="gene-head">
                <span>{gene.label}</span>
                <span style={{ color: 'var(--pink-deep)' }}>{alleleLabel(gene.key, expressed)}</span>
              </div>
              <div className="allele-pair">
                {locus.map((al, i) => {
                  const isExpr = al === expressed;
                  const hiddenMasked = !g.lensed && !isExpr;
                  const rare = isRareAllele(gene.key, al);
                  return (
                    <div key={i} className={`allele ${isExpr ? 'expressed' : ''} ${rare && !hiddenMasked ? 'rare' : ''} ${hiddenMasked ? 'hidden' : ''}`}>
                      {hiddenMasked ? '？？' : alleleLabel(gene.key, al)}{rare && !hiddenMasked ? ' ✨' : ''}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* 連続形質 */}
        <div className="gene-card">
          <div className="gene-head"><span>ポリジーン形質</span></div>
          {GENES.filter((x): x is AdditiveGene => x.kind === 'additive').map((gene) => {
            const v = pheno[gene.key as keyof typeof pheno] as number;
            const meta = GENE_MAP[gene.key] as AdditiveGene;
            const pct = ((v - meta.min) / (meta.max - meta.min)) * 100;
            return (
              <div className="stat" key={gene.key}>
                <div className="stat-head"><span>{gene.label}</span><span>{v.toFixed(2)}</span></div>
                <div className="bar"><div style={{ width: `${pct}%`, background: '#c69bf0' }} /></div>
              </div>
            );
          })}
        </div>

        {/* にがす */}
        <div style={{ marginTop: 16 }}>
          {!confirmRelease ? (
            <button className="btn ghost sm" style={{ color: '#c98' }} onClick={() => setConfirmRelease(true)}>🍃 にがす</button>
          ) : (
            <div className="card" style={{ background: '#fff4f4' }}>
              <div className="center muted">ほんとうに「{g.name}」を にがす？<br />（少し コインが もどるよ）</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button className="btn ghost sm" style={{ flex: 1 }} onClick={() => setConfirmRelease(false)}>やめる</button>
                <button className="btn sm" style={{ flex: 1 }} onClick={() => { release(g.id); show('げんきでね…🍃'); onClose(); }}>にがす</button>
              </div>
            </div>
          )}
        </div>

        <button className="btn" style={{ marginTop: 16 }} onClick={onClose}>とじる</button>
      </div>
    </div>
  );
}
