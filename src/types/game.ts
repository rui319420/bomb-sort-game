export type BombColor = 'black' | 'red';

export interface Bomb {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: BombColor;
}