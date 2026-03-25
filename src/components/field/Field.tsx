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
    setBombs(prevBombs => prevBombs.map(bomb => {
      let { x, y, vx, vy } = bomb;

      // 位置の更新
      x += vx;
      y += vy;

      // 外壁との衝突判定
      if (x < 0 || x > FIELD_SIZE - BOMB_SIZE) vx *= -1;
      if (y < 0 || y > FIELD_SIZE - BOMB_SIZE) vy *= -1;

      // ケージとの衝突判定 (左ケージ: 0~200, 右ケージ: 440~640)
      const inLeftCageX = x < CAGE_SIZE;
      const inRightCageX = x > FIELD_SIZE - CAGE_SIZE - BOMB_SIZE;
      const inCageY = y > (FIELD_SIZE - CAGE_SIZE) / 2 && y < (FIELD_SIZE + CAGE_SIZE) / 2 - BOMB_SIZE;

      if (inCageY && (inLeftCageX || inRightCageX)) {
        vx *= -1; // 横方向で跳ね返る
        // めり込み防止
        x = inLeftCageX ? CAGE_SIZE : FIELD_SIZE - CAGE_SIZE - BOMB_SIZE;
      }

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