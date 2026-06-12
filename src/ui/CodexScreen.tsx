import { useGame } from '../game/store';
import { GENES, DiscreteGene } from '../genetics/genes';

const GENE_ICON: Record<string, string> = {
  bodyShape: '⬭', baseColor: '🎨', pattern: '🟣', patternColor: '🖌️', earType: '👂',
  eyeType: '👀', eyeColor: '🌈', mouthType: '👄', cheekType: '🌸', tailType: '🐾',
  hornType: '🦄', wingType: '🦋', aura: '✨', temperament: '💭',
};

export default function CodexScreen() {
  const codex = useGame((s) => s.codex);
  const discreteGenes = GENES.filter((g): g is DiscreteGene => g.kind === 'discrete');

  const totalAlleles = discreteGenes.reduce((n, g) => n + g.alleles.length, 0);
  const discovered = discreteGenes.reduce(
    (n, g) => n + g.alleles.filter((a) => (codex[`${g.key}:${a.id}`] ?? 0) > 0).length,
    0,
  );

  return (
    <div className="screen">
      <div className="screen-title">ずかん — みつけた形質 {discovered}/{totalAlleles}</div>
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="bar"><div style={{ width: `${(discovered / totalAlleles) * 100}%`, background: 'var(--pink-deep)' }} /></div>
        <div className="muted center" style={{ marginTop: 8, fontSize: 11 }}>
          ふ化させた ゲノモンの形質が きろくされるよ。<br />レア形質を コンプリートしよう！✨
        </div>
      </div>

      {discreteGenes.map((g) => {
        const found = g.alleles.filter((a) => (codex[`${g.key}:${a.id}`] ?? 0) > 0).length;
        return (
          <div className="codex-group" key={g.key}>
            <div className="screen-title" style={{ margin: '0 2px 8px' }}>
              {GENE_ICON[g.key] ?? '🧬'} {g.label}（{found}/{g.alleles.length}）
            </div>
            <div className="codex-grid">
              {g.alleles.map((a) => {
                const count = codex[`${g.key}:${a.id}`] ?? 0;
                const locked = count === 0;
                return (
                  <div className={`codex-cell ${locked ? 'locked' : ''}`} key={a.id}>
                    <div className="cc-art">{locked ? '❔' : a.rare ? '✨' : '🧬'}</div>
                    <div>{locked ? '？？？' : a.label}</div>
                    {!locked && <div className="cc-count">×{count}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
