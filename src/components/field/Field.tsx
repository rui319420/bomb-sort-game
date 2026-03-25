'use client'

import { useEffect, useState, useRef } from "react";
import styles from "./Field.module.css"
import { Cage } from "../Cage/Cage";
import { Entrance } from "../entrance/Entrance";
import { Bomb, BombColor } from "../../types/game";

export function Field() {
  const [bombs, setBombs] = useState<Bomb[]>([]);
  const requestRef    = useRef<number | null>(null);
  const draggingId    = useRef<string | null>(null);
  const mousePos      = useRef({ x: 0, y: 0 });
  const prevMousePos  = useRef({ x: 0, y: 0 });
  const fieldRef      = useRef<HTMLDivElement>(null);

  const FIELD_SIZE = 640;
  const BOMB_SIZE  = 40;
  const CAGE_SIZE  = 200;
  const CAGE_TOP   = (FIELD_SIZE - CAGE_SIZE) / 2;

  // ── AABB最小貫通方向で押し出し ──────────────────────────────
  const resolveAABB = (
    bx: number, by: number, vx: number, vy: number,
    cx: number, cy: number, cw: number, ch: number
  ) => {
    const oL = (bx + BOMB_SIZE) - cx;
    const oR = (cx + cw) - bx;
    const oT = (by + BOMB_SIZE) - cy;
    const oB = (cy + ch) - by;
    if (oL <= 0 || oR <= 0 || oT <= 0 || oB <= 0) return { bx, by, vx, vy };

    if (Math.min(oL, oR) < Math.min(oT, oB)) {
      return oL < oR
        ? { bx: cx - BOMB_SIZE, by, vx: -Math.abs(vx), vy }
        : { bx: cx + cw,        by, vx:  Math.abs(vx), vy };
    } else {
      return oT < oB
        ? { bx, by: cy - BOMB_SIZE, vx, vy: -Math.abs(vy) }
        : { bx, by: cy + ch,        vx, vy:  Math.abs(vy) };
    }
  };

  // ── 物理ループ ────────────────────────────────────────────
  const updatePhysics = () => {
    setBombs(prev => prev.map(bomb => {
      // ドラッグ中はマウス中心に追従、物理スキップ
      if (bomb.status === "dragging") {
        return {
          ...bomb,
          x: mousePos.current.x - BOMB_SIZE / 2,
          y: mousePos.current.y - BOMB_SIZE / 2,
        };
      }

      let { x, y, vx, vy } = bomb;
      x += vx;
      y += vy;

      // 外壁
      if (x < 0)                           { x = 0;                       vx =  Math.abs(vx); }
      else if (x > FIELD_SIZE - BOMB_SIZE) { x = FIELD_SIZE - BOMB_SIZE;  vx = -Math.abs(vx); }
      if (y < 0)                           { y = 0;                       vy =  Math.abs(vy); }
      else if (y > FIELD_SIZE - BOMB_SIZE) { y = FIELD_SIZE - BOMB_SIZE;  vy = -Math.abs(vy); }

      // ケージ衝突
      ({ bx: x, by: y, vx, vy } = resolveAABB(x, y, vx, vy, 0,                    CAGE_TOP, CAGE_SIZE, CAGE_SIZE));
      ({ bx: x, by: y, vx, vy } = resolveAABB(x, y, vx, vy, FIELD_SIZE - CAGE_SIZE, CAGE_TOP, CAGE_SIZE, CAGE_SIZE));

      return { ...bomb, x, y, vx, vy };
    }));

    requestRef.current = requestAnimationFrame(updatePhysics);
  };

  const spawnBomb = () => {
    const colors: BombColor[] = ["red", "black"];
    const newBomb: Bomb = {
      id: Math.random().toString(36).substr(2, 9),
      color: colors[Math.floor(Math.random() * colors.length)],
      x: FIELD_SIZE / 2,
      y: 60,
      vx: (Math.random() - 0.5) * 4,
      vy: Math.random() * 2 + 2,
      wobbleSeed: Math.random(),
      status: "active",
    };
    setBombs(prev => [...prev, newBomb]);
  };

  useEffect(() => {
    const id = setInterval(spawnBomb, 3000);
    requestRef.current = requestAnimationFrame(updatePhysics);
    return () => {
      clearInterval(id);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  // ── ヘルパー ─────────────────────────────────────────────
  const getFieldPos = (clientX: number, clientY: number) => {
    const rect = fieldRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const grab = (id: string) => {
    draggingId.current = id;
    setBombs(prev => prev.map(b =>
      b.id === id ? { ...b, status: "dragging" as const, vx: 0, vy: 0 } : b
    ));
  };

  const release = () => {
    if (!draggingId.current) return;
    const id = draggingId.current;
    draggingId.current = null;

    // 直前フレームとの差分から投げる速度を計算
    const vx = (mousePos.current.x - prevMousePos.current.x) * 0.5;
    const vy = (mousePos.current.y - prevMousePos.current.y) * 0.5;

    setBombs(prev => prev.map(b =>
      b.id === id ? { ...b, status: "active" as const, vx, vy } : b
    ));
  };

  // ── マウスイベント ────────────────────────────────────────
  const handleMouseMove = (e: React.MouseEvent) => {
    const pos = getFieldPos(e.clientX, e.clientY);
    prevMousePos.current = { ...mousePos.current };
    mousePos.current = pos;
  };

  const handleBombMouseDown = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    const pos = getFieldPos(e.clientX, e.clientY);
    mousePos.current = pos;
    prevMousePos.current = pos;
    grab(id);
  };

  // ── Shiftキーグラブ ───────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Shift" || e.repeat || draggingId.current) return;

      const { x: mx, y: my } = mousePos.current;
      setBombs(prev => {
        const target = prev.find(b => {
          if (b.status !== "active") return false;
          return Math.hypot(mx - (b.x + BOMB_SIZE / 2), my - (b.y + BOMB_SIZE / 2)) < BOMB_SIZE;
        });
        if (!target) return prev;
        draggingId.current = target.id;
        return prev.map(b =>
          b.id === target.id ? { ...b, status: "dragging" as const, vx: 0, vy: 0 } : b
        );
      });
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Shift") release();
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup",   onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup",   onKeyUp);
    };
  }, []);

  return (
    <div
      className={styles.field}
      ref={fieldRef}
      onMouseMove={handleMouseMove}
      onMouseUp={release}
      onMouseLeave={release}  // フィールド外に出たら自動リリース
    >
      <Entrance />
      <Cage color="red" />
      {bombs.map(bomb => (
        <div
          key={bomb.id}
          onMouseDown={(e) => handleBombMouseDown(e, bomb.id)}
          style={{
            position:        'absolute',
            left:            bomb.x,
            top:             bomb.y,
            width:           `${BOMB_SIZE}px`,
            height:          `${BOMB_SIZE}px`,
            borderRadius:    '50%',
            backgroundColor: bomb.color,
            border:          bomb.status === "dragging" ? '3px solid yellow' : '2px solid white',
            zIndex:          bomb.status === "dragging" ? 20 : 10,
            cursor:          bomb.status === "dragging" ? 'grabbing' : 'grab',
            userSelect:      'none',
          }}
        />
      ))}
      <Cage color="black" />
    </div>
  );
}