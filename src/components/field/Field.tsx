'use client'

import { useEffect, useState, useRef, useCallback } from "react";
import styles from "./Field.module.css"
import { Cage } from "../Cage/Cage";
import { Entrance } from "../entrance/Entrance";
import { Bomb, BombColor, GamePhase } from "../../types/game";
import { Explosion } from "../explosion/Explosion";

type ExplosionData = { id: string; x: number; y: number };

// ── コンポーネント外に定数を移動 ──────────────────────────────
const FIELD_SIZE = 640;
const BOMB_SIZE  = 40;
const CAGE_SIZE  = 200;
const CAGE_TOP   = (FIELD_SIZE - CAGE_SIZE) / 2;

const CAGES = [
  { color: "red"   as BombColor, x: 0,                     y: CAGE_TOP, w: CAGE_SIZE, h: CAGE_SIZE },
  { color: "black" as BombColor, x: FIELD_SIZE - CAGE_SIZE, y: CAGE_TOP, w: CAGE_SIZE, h: CAGE_SIZE },
];

// ── resolveAABBも外に移動（引数だけで完結するため） ──────────
function resolveAABB(
  bx: number, by: number, vx: number, vy: number,
  cx: number, cy: number, cw: number, ch: number
) {
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
}

function getEnteredCage(x: number, y: number) {
  const cx = x + BOMB_SIZE / 2;
  const cy = y + BOMB_SIZE / 2;
  return CAGES.find(cage =>
    cx > cage.x && cx < cage.x + cage.w &&
    cy > cage.y && cy < cage.y + cage.h
  ) ?? null;
}

// ─────────────────────────────────────────────────────────────

export function Field() {
  const [bombs, setBombs]           = useState<Bomb[]>([]);
  const [score, setScore]           = useState(0);
  const [gamePhase, setGamePhase]   = useState<GamePhase>("playing");
  const [explosions, setExplosions] = useState<ExplosionData[]>([]);

  const requestRef   = useRef<number | null>(null);
  const draggingId   = useRef<string | null>(null);
  const mousePos     = useRef({ x: 0, y: 0 });
  const prevMousePos = useRef({ x: 0, y: 0 });
  const fieldRef     = useRef<HTMLDivElement>(null);
  const gamePhaseRef = useRef<GamePhase>("playing");

  // ── 物理ループ ──────────────────────────────────────────────
  const updatePhysics = useCallback(() => {
    if (gamePhaseRef.current === "playing") {
      setBombs(prev => prev.map(bomb => {
        if (bomb.status === "sorted") return bomb;

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

        if (x < 0)                           { x = 0;                       vx =  Math.abs(vx); }
        else if (x > FIELD_SIZE - BOMB_SIZE) { x = FIELD_SIZE - BOMB_SIZE;  vx = -Math.abs(vx); }
        if (y < 0)                           { y = 0;                       vy =  Math.abs(vy); }
        else if (y > FIELD_SIZE - BOMB_SIZE) { y = FIELD_SIZE - BOMB_SIZE;  vy = -Math.abs(vy); }

        for (const cage of CAGES) {
          ({ bx: x, by: y, vx, vy } = resolveAABB(x, y, vx, vy, cage.x, cage.y, cage.w, cage.h));
        }

        return { ...bomb, x, y, vx, vy };
      }));
    }
    requestRef.current = requestAnimationFrame(updatePhysics);
  }, []);

  // ── スポーン（Math.randomをuseCallbackで保護） ───────────────
  const spawnBomb = useCallback(() => {
    if (gamePhaseRef.current !== "playing") return;
    const colors: BombColor[] = ["red", "black"];
    const newBomb: Bomb = {
      id:          Math.random().toString(36).substr(2, 9),
      color:       colors[Math.floor(Math.random() * colors.length)],
      x:           FIELD_SIZE / 2,
      y:           60,
      vx:          (Math.random() - 0.5) * 4,
      vy:          Math.random() * 2 + 2,
      wobbleSeed:  Math.random(),
      status:      "active",
    };
    setBombs(prev => [...prev, newBomb]);
  }, []);

  useEffect(() => {
    const id = setInterval(spawnBomb, 3000);
    requestRef.current = requestAnimationFrame(updatePhysics);
    return () => {
      clearInterval(id);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [spawnBomb, updatePhysics]);

  // ── ヘルパー ────────────────────────────────────────────────
  const getFieldPos = (clientX: number, clientY: number) => {
    const rect = fieldRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const grab = (id: string) => {
    if (gamePhaseRef.current !== "playing") return;
    draggingId.current = id;
    setBombs(prev => prev.map(b =>
      b.id === id ? { ...b, status: "dragging" as const, vx: 0, vy: 0 } : b
    ));
  };

  const release = useCallback(() => {
    if (!draggingId.current) return;
    const id = draggingId.current;
    draggingId.current = null;

    const vx = (mousePos.current.x - prevMousePos.current.x) * 0.5;
    const vy = (mousePos.current.y - prevMousePos.current.y) * 0.5;

    setBombs(prev => {
      const bomb = prev.find(b => b.id === id);
      if (!bomb) return prev;

      const dropX    = mousePos.current.x - BOMB_SIZE / 2;
      const dropY    = mousePos.current.y - BOMB_SIZE / 2;
      const entered  = getEnteredCage(dropX, dropY);

      if (entered) {
        if (entered.color === bomb.color) {
          setScore(s => s + 1);
          return prev.map(b => b.id === id ? { ...b, status: "sorted" as const } : b);
        } else {
          gamePhaseRef.current = "failed";
          setGamePhase("failed");
          setExplosions(prev.map(b => ({
            id: b.id,
            x:  b.id === id ? mousePos.current.x : b.x + BOMB_SIZE / 2,
            y:  b.id === id ? mousePos.current.y : b.y + BOMB_SIZE / 2,
          })));
          return prev.map(b => ({ ...b, status: "sorted" as const }));
        }
      }

      return prev.map(b =>
        b.id === id ? { ...b, status: "active" as const, vx, vy } : b
      );
    });
  }, []);

  // ── マウスイベント ──────────────────────────────────────────
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

  // ── Shiftキーグラブ ─────────────────────────────────────────
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
    const onKeyUp = (e: KeyboardEvent) => { if (e.key === "Shift") release(); };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup",   onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup",   onKeyUp);
    };
  }, [release]);

  // ── リセット ────────────────────────────────────────────────
  const reset = () => {
    gamePhaseRef.current = "playing";
    setGamePhase("playing");
    setScore(0);
    setBombs([]);
    setExplosions([]);
  };

  return (
    <div
      className={styles.field}
      ref={fieldRef}
      onMouseMove={handleMouseMove}
      onMouseUp={release}
      onMouseLeave={release}
    >
      <Entrance />
      <Cage color="red" />

      {bombs.map(bomb =>
        bomb.status === "sorted" ? null : (
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
        )
      )}

      {explosions.map(exp => (
        <Explosion
          key={exp.id}
          x={exp.x}
          y={exp.y}
          onDone={() => setExplosions(prev => prev.filter(e => e.id !== exp.id))}
        />
      ))}

      <Cage color="black" />

      <div style={{
        position: 'absolute', top: 8, right: 8,
        color: 'white', fontSize: 18, fontWeight: 'bold',
        zIndex: 30, textShadow: '1px 1px 2px black'
      }}>
        SCORE: {score}
      </div>

      {gamePhase === "failed" && (
        <div style={{
          position: 'absolute', inset: 0,
          backgroundColor: 'rgba(0,0,0,0.75)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          zIndex: 50, gap: 16,
        }}>
          <div style={{ fontSize: 48, color: 'red', fontWeight: 'bold' }}>💥 GAME OVER</div>
          <div style={{ fontSize: 24, color: 'white' }}>SCORE: {score}</div>
          <button
            onClick={reset}
            style={{
              padding: '10px 32px', fontSize: 18,
              backgroundColor: 'white', borderRadius: 8,
              border: 'none', cursor: 'pointer', fontWeight: 'bold',
            }}
          >
            もう一度
          </button>
        </div>
      )}
    </div>
  );
}