// src/components/explosion/Explosion.tsx
'use client'

import { useEffect, useState } from "react";
import styles from "./Explosion.module.css";

type Props = {
  x: number;
  y: number;
  onDone: () => void;
};

const SPARK_COUNT = 10;

export function Explosion({ x, y, onDone }: Props) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onDone();
    }, 700);
    return () => clearTimeout(timer);
  }, [onDone]);

  if (!visible) return null;

  return (
    <div className={styles.wrapper} style={{ left: x, top: y }}>
      <div className={`${styles.ring} ${styles.ring1}`} />
      <div className={`${styles.ring} ${styles.ring2}`} />
      <div className={`${styles.ring} ${styles.ring3}`} />
      {Array.from({ length: SPARK_COUNT }).map((_, i) => (
        <div
          key={i}
          className={styles.spark}
          style={{ "--angle": `${i * (360 / SPARK_COUNT)}deg` } as React.CSSProperties}
        />
      ))}
    </div>
  );
}