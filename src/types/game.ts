export type BombColor = "black" | "red";

export type BombStatus = "active" | "dragging" | "sorted";

export type GamePhase = "ready" | "playing" | "clear" | "failed";

export interface Bomb {
  id: string;
  color: BombColor;
  x: number;
	y: number;
	vx: number;
	vy: number;
  wobbleSeed: number;
  status: BombStatus;
  stackIndex?: number;
}

export interface ZoneLayout {
  type: BombColor;
  left: number;
  top: number;
  width: number;
  height: number;
  fill: string;
  glow: string;
  label: string;
  subtitle: string;
}
