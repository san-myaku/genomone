import { useEffect, useState } from 'react';
import { useGame } from './game/store';
import HomeScreen from './ui/HomeScreen';
import RanchScreen from './ui/RanchScreen';
import EggScreen from './ui/EggScreen';
import BreedScreen from './ui/BreedScreen';
import CodexScreen from './ui/CodexScreen';
import DetailModal from './ui/DetailModal';
import ShopModal from './ui/ShopModal';
import { Toast } from './ui/common';

type Tab = 'home' | 'ranch' | 'eggs' | 'breed' | 'codex';

const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: 'home', icon: '🏠', label: 'おうち' },
  { id: 'ranch', icon: '🌳', label: 'ぼくじょう' },
  { id: 'eggs', icon: '🥚', label: 'たまご' },
  { id: 'breed', icon: '💞', label: 'こうはい' },
  { id: 'codex', icon: '📖', label: 'ずかん' },
];

export default function App() {
  const init = useGame((s) => s.init);
  const tick = useGame((s) => s.tick);
  const coins = useGame((s) => s.coins);
  const eggs = useGame((s) => s.eggs);

  const [tab, setTab] = useState<Tab>('home');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [shopOpen, setShopOpen] = useState(false);

  useEffect(() => {
    init();
    const t = setInterval(() => tick(Date.now()), 4000);
    const onVis = () => { if (!document.hidden) tick(Date.now()); };
    document.addEventListener('visibilitychange', onVis);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', onVis); };
  }, [init, tick]);

  const openDetail = (id: string) => setDetailId(id);

  return (
    <div className="app">
      <header className="header">
        <div className="logo">ゲノモン<small>ガチ育種たまごっち</small></div>
        <div className="header-spacer" />
        <span className="pill coins">🪙 {coins}</span>
        <button className="icon-btn" onClick={() => setShopOpen(true)} aria-label="ショップ">🛒</button>
      </header>

      {tab === 'home' && <HomeScreen onOpenDetail={openDetail} />}
      {tab === 'ranch' && <RanchScreen onOpenDetail={openDetail} />}
      {tab === 'eggs' && <EggScreen />}
      {tab === 'breed' && <BreedScreen />}
      {tab === 'codex' && <CodexScreen />}

      <nav className="tabbar">
        {TABS.map((t) => (
          <button key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            <span className="ti" style={{ position: 'relative' }}>
              {t.icon}
              {t.id === 'eggs' && eggs.length > 0 && <span className="badge">{eggs.length}</span>}
            </span>
            {t.label}
          </button>
        ))}
      </nav>

      {detailId && <DetailModal id={detailId} onClose={() => setDetailId(null)} />}
      {shopOpen && <ShopModal onClose={() => setShopOpen(false)} />}
      <Toast />
    </div>
  );
}
