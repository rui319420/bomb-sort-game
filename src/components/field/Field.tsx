'use client'

import { useEffect, useState } from "react";
import styles from "./Field.module.css"
import { Cage } from "../Cage/Cage";
import { Entrance } from "../entrance/Entrance";
import { Bomb, BombColor } from "../../types/game";

export function Field() {
  const [bombs, setBombs] = useState<Bomb[]>([]);

  // 爆弾を生成する関数
  const spawnBomb = () => {
    const colors: BombColor[] = ["red", "black"];
    const newBomb: Bomb = {
      id: Math.random().toString(36).substr(2, 9),
      color: colors[Math.floor(Math.random() * colors.length)],
      x: 320, // ボード中央
      y: 50,  // Entranceの少し下
      wobbleSeed: Math.random(),
      status: "active"
    };
    setBombs(prev => [...prev, newBomb]);
  };

  useEffect(() => {
    const interval = setInterval(spawnBomb, 2000); // 2秒ごとに生成
    return () => clearInterval(interval);
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
            left: bomb.x - 20,
            top: bomb.y,
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: bomb.color,
            border: '2px solid white',
            transition: 'all 0.3s ease',
            zIndex: 10
          }}
        />
      ))}

      <Cage color="black" />
    </div>
  )
}