import { Genome } from '../genetics/genome';

export type Stage = 'baby' | 'child' | 'adult' | 'elder';

export const STAGE_LABEL: Record<Stage, string> = {
  baby: 'ベビー',
  child: 'こども',
  adult: 'おとな',
  elder: 'ちょうろう',
};

export interface Stats {
  hunger: number; // 満腹度（高い=満たされている）
  happy: number; // きげん
  energy: number; // げんき
  clean: number; // きれい
  bond: number; // なつき
}

export interface Genomon {
  id: string;
  name: string;
  genome: Genome;
  bornAt: number;
  ageDays: number;
  stage: Stage;
  stats: Stats;
  generation: number;
  parents: [string, string] | null;
  lastTick: number;
  mutagen: boolean; // 次の交配で変異率アップ
  lensed: boolean; // 隠れ遺伝子が見えている
}

export interface Egg {
  id: string;
  genome: Genome;
  warmth: number; // 0..100
  generation: number;
  parents: [string, string] | null;
  createdAt: number;
}

export interface Inventory {
  gochiso: number; // ごちそう
  mutagen: number; // へんいそくしんざい
  lens: number; // いでんしレンズ
}
