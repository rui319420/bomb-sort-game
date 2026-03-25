'use client'

import { useEffect, useState, useRef } from "react";
import styles from "./Field.module.css"
import { Cage } from "../Cage/Cage";
import { Entrance } from "../entrance/Entrance";
import { Bomb, BombColor } from "../../types/game";

export function Field() {
  const [bombs, setBombs] = useState<Bomb[]>([]);
  const requestRef = useRef<number>(null);

  const FIELD_SIZE = 640;
  const BOMB_SIZE = 40;
  const CAGE_SIZE = 200;

  const spawnBomb = () => {
    const colors: BombColor[] = ["red", "black"];
    const newBomb: Bomb = {
      id: Math.random().toString(36).substr(2, 9),
      color: colors[Math.floor(Math.random() * colors.length)],
      x: FIELD_SIZE / 2,
      y: 60,
      vx: (Math.random() - 0.5) * 4, // 初速をランダムに設定
      vy: Math.random() * 2 + 2,
      wobbleSeed: Math.random(),
      status: "active"
    };
    setBombs(prev => [...prev, newBomb]);
  };

	const updatePhysics = () => {
		const CAGE_TOP    = (FIELD_SIZE - CAGE_SIZE) / 2;
		const CAGE_BOTTOM = CAGE_TOP + CAGE_SIZE;

		// AABB衝突解決: 最小貫通方向に押し出す
		const resolveAABB = (
			bx: number, by: number,
			vx: number, vy: number,
			cx: number, cy: number, cw: number, ch: number
		) => {
			const overlapLeft   = (bx + BOMB_SIZE) - cx;
			const overlapRight  = (cx + cw) - bx;
			const overlapTop    = (by + BOMB_SIZE) - cy;
			const overlapBottom = (cy + ch) - by;

			// 重なっていなければスキップ
			if (overlapLeft <= 0 || overlapRight <= 0 || overlapTop <= 0 || overlapBottom <= 0) {
				return { bx, by, vx, vy };
			}

			const minX = Math.min(overlapLeft, overlapRight);
			const minY = Math.min(overlapTop, overlapBottom);

			if (minX < minY) {
				// 横方向が最小 → 横に押し出し（左右壁から入った）
				if (overlapLeft < overlapRight) {
					return { bx: cx - BOMB_SIZE, by, vx: -Math.abs(vx), vy };
				} else {
					return { bx: cx + cw, by, vx: Math.abs(vx), vy };
				}
			} else {
				// 縦方向が最小 → 縦に押し出し（上下から入った）
				if (overlapTop < overlapBottom) {
					return { bx, by: cy - BOMB_SIZE, vx, vy: -Math.abs(vy) };
				} else {
					return { bx, by: cy + ch, vx, vy: Math.abs(vy) };
				}
			}
		};

		setBombs(prevBombs => prevBombs.map(bomb => {
			let { x, y, vx, vy } = bomb;

			x += vx;
			y += vy;

			// 外壁
			if (x < 0)                          { x = 0;                        vx =  Math.abs(vx); }
			else if (x > FIELD_SIZE - BOMB_SIZE) { x = FIELD_SIZE - BOMB_SIZE;  vx = -Math.abs(vx); }
			if (y < 0)                          { y = 0;                        vy =  Math.abs(vy); }
			else if (y > FIELD_SIZE - BOMB_SIZE) { y = FIELD_SIZE - BOMB_SIZE;  vy = -Math.abs(vy); }

			// 左ケージ (x=0..200, y=CAGE_TOP..CAGE_BOTTOM)
			({ bx: x, by: y, vx, vy } = resolveAABB(x, y, vx, vy, 0, CAGE_TOP, CAGE_SIZE, CAGE_SIZE));

			// 右ケージ (x=440..640, y=CAGE_TOP..CAGE_BOTTOM)
			({ bx: x, by: y, vx, vy } = resolveAABB(x, y, vx, vy, FIELD_SIZE - CAGE_SIZE, CAGE_TOP, CAGE_SIZE, CAGE_SIZE));

			return { ...bomb, x, y, vx, vy };
		}));

		requestRef.current = requestAnimationFrame(updatePhysics);
	};

  useEffect(() => {
    const spawnInterval = setInterval(spawnBomb, 3000);
    requestRef.current = requestAnimationFrame(updatePhysics);
    return () => {
      clearInterval(spawnInterval);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  return (
    <div className={styles.field}>
      <Entrance />
      <Cage color="red" />
      {bombs.map(bomb => (
        <div
          key={bomb.id}
          style={{
            position: 'absolute',
            left: bomb.x,
            top: bomb.y,
            width: `${BOMB_SIZE}px`,
            height: `${BOMB_SIZE}px`,
            borderRadius: '50%',
            backgroundColor: bomb.color,
            border: '2px solid white',
            zIndex: 10,
            pointerEvents: 'none'
          }}
        />
      ))}
      <Cage color="black" />
    </div>
  )
}