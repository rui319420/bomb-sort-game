// src/components/field/Field.tsx
'use client'

import { useEffect, useState, useRef, useCallback } from "react";
import styles from "./Field.module.css";
import { Cage } from "../Cage/Cage";
import { Entrance } from "../entrance/Entrance";
import { Bomb, BombColor, GamePhase } from "../../types/game";
import { Explosion } from "../explosion/Explosion";

type ExplosionData = { id: string; x: number; y: number };

// ── 定数 ──────────────────────────────────────────────────────
const FIELD_WIDTH  = 980;
const FIELD_HEIGHT = 540;
const BOMB_SIZE    = 64;
const CAGE_WIDTH   = 260;
const CAGE_HEIGHT  = 300;
const CAGE_TOP     = (FIELD_HEIGHT - CAGE_HEIGHT) / 2;
const BOMB_TTL = 12000; // 12秒で爆発
const SCORE_PER_SORT = 1;
const WARNING_WINDOW = 3000; // 爆発3秒前から警告
const BLINK_INTERVAL = 180; // 点滅周期(ms)

const CAGES = [
  { color: "red"   as BombColor, x: 0,                        y: CAGE_TOP, w: CAGE_WIDTH, h: CAGE_HEIGHT },
  { color: "black" as BombColor, x: FIELD_WIDTH - CAGE_WIDTH, y: CAGE_TOP, w: CAGE_WIDTH, h: CAGE_HEIGHT },
];

// ── 純粋関数群（コンポーネント外） ───────────────────────────
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
  return CAGES.find(c =>
    cx > c.x && cx < c.x + c.w && cy > c.y && cy < c.y + c.h
  ) ?? null;
}

function makeBomb(origin: "top" | "bottom"): Bomb {
  const colors: BombColor[] = ["red", "black"];
  const isTop = origin === "top";
  return {
    id:         Math.random().toString(36).substr(2, 9),
    color:      colors[Math.floor(Math.random() * colors.length)],
    x:          FIELD_WIDTH / 2 - BOMB_SIZE / 2 + (Math.random() - 0.5) * 60,
    y:          isTop ? 60 : FIELD_HEIGHT - 60 - BOMB_SIZE,
    vx:         (Math.random() - 0.5) * 2,
    vy:         isTop ? (Math.random() * 1 + 1) : -(Math.random() * 1 + 1),
    wobbleSeed: Math.random(),
    status:     "active",
    spawnedAt:  Date.now(),
  };
}

// ─────────────────────────────────────────────────────────────

export function Field() {
  const [bombs, setBombs]           = useState<Bomb[]>([]);
  const [score, setScore]           = useState(0);
  const [gamePhase, setGamePhase]   = useState<GamePhase>("playing");
  const [explosions, setExplosions] = useState<ExplosionData[]>([]);
  const [hasExploded, setHasExploded] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const requestRef      = useRef<number | null>(null);
  const draggingId      = useRef<string | null>(null);
  const mousePos        = useRef({ x: 0, y: 0 });
  const prevMousePos    = useRef({ x: 0, y: 0 });
  const fieldRef        = useRef<HTMLDivElement>(null);
  const gamePhaseRef    = useRef<GamePhase>("playing");

  // ── 全爆発ヘルパー ──────────────────────────────────────────
  const triggerAllExplosions = useCallback((
    snapshot: Bomb[],
    epicenterId?: string,
    epicenterX?: number,
    epicenterY?: number,
  ) => {
    gamePhaseRef.current = "failed";
    setGamePhase("failed");
    setHasExploded(true);
    setExplosions(snapshot.map(b => ({
      id: b.id,
      x:  b.id === epicenterId && epicenterX !== undefined ? epicenterX : b.x + BOMB_SIZE / 2,
      y:  b.id === epicenterId && epicenterY !== undefined ? epicenterY : b.y + BOMB_SIZE / 2,
    })));
  }, []);

  // ── 物理ループ ──────────────────────────────────────────────
  const updatePhysics = useCallback(() => {
    if (gamePhaseRef.current === "playing") {
      const now = Date.now();

      setBombs(prev => {
        // TTL切れの爆弾を検出
        const expired = prev.filter(b => b.status === "active" && now - b.spawnedAt > BOMB_TTL);

        if (expired.length > 0) {
          // ゲームオーバー：全爆弾を爆発させる
          triggerAllExplosions(prev);
          return prev.map(b => ({ ...b, status: "sorted" as const }));
        }

        // 通常物理演算
        return prev.map(bomb => {
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

          if (x < 0)                            { x = 0;                        vx =  Math.abs(vx); }
          else if (x > FIELD_WIDTH - BOMB_SIZE) { x = FIELD_WIDTH - BOMB_SIZE;  vx = -Math.abs(vx); }
          if (y < 0)                             { y = 0;                         vy =  Math.abs(vy); }
          else if (y > FIELD_HEIGHT - BOMB_SIZE) { y = FIELD_HEIGHT - BOMB_SIZE; vy = -Math.abs(vy); }

          for (const cage of CAGES) {
            ({ bx: x, by: y, vx, vy } = resolveAABB(x, y, vx, vy, cage.x, cage.y, cage.w, cage.h));
          }

          return { ...bomb, x, y, vx, vy };
        });
      });
    }
  }, [triggerAllExplosions]);

  // ── 物理ループ開始 ─────────────────────────────────────────
  useEffect(() => {
    const tick = () => {
      updatePhysics();
      requestRef.current = requestAnimationFrame(tick);
    };
    requestRef.current = requestAnimationFrame(tick);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [updatePhysics]);

  // ── ウェーブ管理 ────────────────────────────────────────────
  useEffect(() => {
    if (gamePhase !== "playing") return;

    const spawn = (origins: Array<"top" | "bottom">) => {
      if (gamePhaseRef.current !== "playing") return;
      const newBombs = origins.map(o => makeBomb(o));
      setBombs(prev => [...prev, ...newBombs]);
    };

    let currentInterval = setInterval(() => spawn(["top"]), 2000);
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    // Wave 2: 14秒〜 1秒ごとに上or下から1つ
    timeouts.push(setTimeout(() => {
      clearInterval(currentInterval);
      currentInterval = setInterval(() => {
        spawn([Math.random() > 0.5 ? "top" : "bottom"]);
      }, 1000);
    }, 14000));

    // Wave 3: 28秒〜 2秒ごとに上下から各1つ
    timeouts.push(setTimeout(() => {
      clearInterval(currentInterval);
      currentInterval = setInterval(() => spawn(["top", "bottom"]), 2000);
		}, 28000));
		
		timeouts.push(setTimeout(() => {
      clearInterval(currentInterval);
      currentInterval = setInterval(() => spawn(["top", "bottom"]), 1500);
    }, 44000));

    // Wave 4: 44秒〜 2秒ごとに上下から各2つ
    timeouts.push(setTimeout(() => {
      clearInterval(currentInterval);
      currentInterval = setInterval(() => spawn(["top", "top", "bottom", "bottom"]), 2400);
    }, 60000));

    return () => {
      clearInterval(currentInterval);
      timeouts.forEach(clearTimeout);
    };
  }, [gamePhase]);

  // ── 表示用タイムスタンプ更新（TTL警告点滅に使用） ───────────
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 120);
    return () => clearInterval(id);
  }, []);

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

    const vx = (mousePos.current.x - prevMousePos.current.x) * 0.3;
    const vy = (mousePos.current.y - prevMousePos.current.y) * 0.3;

    setBombs(prev => {
      const bomb = prev.find(b => b.id === id);
      if (!bomb) return prev;

      const dropX   = mousePos.current.x - BOMB_SIZE / 2;
      const dropY   = mousePos.current.y - BOMB_SIZE / 2;
      const entered = getEnteredCage(dropX, dropY);

      if (entered) {
        if (entered.color === bomb.color) {
          // ✅ 正解
          setScore(s => s + SCORE_PER_SORT);
          return prev.map(b => b.id === id ? { ...b, status: "sorted" as const } : b);
        } else {
          // ❌ 不正解：全爆発
          triggerAllExplosions(prev, id, mousePos.current.x, mousePos.current.y);
          return prev.map(b => ({ ...b, status: "sorted" as const }));
        }
      }

      return prev.map(b =>
        b.id === id ? { ...b, status: "active" as const, vx, vy } : b
      );
    });
  }, [triggerAllExplosions]);

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
    setHasExploded(false);
    gamePhaseRef.current = "playing";
    setGamePhase("playing");
    setScore(0);
    setBombs([]);
    setExplosions([]);
  };

  // 爆発が全て終わった後にゲームオーバーを表示
  const showGameOver = gamePhase === "failed"
    && hasExploded
    && explosions.length === 0;

  return (
    <div
      className={styles.field}
      ref={fieldRef}
      onMouseMove={handleMouseMove}
      onMouseUp={release}
      onMouseLeave={release}
    >
      <Entrance />

      {/* 下側入口 */}
      <div style={{
        position: 'absolute', bottom: 0, left: '50%',
        transform: 'translateX(-50%)',
        width: 100, height: 50,
        backgroundColor: 'aqua',
        borderRadius: '20px 20px 0 0',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'aliceblue', fontSize: 12, zIndex: 5,
      }}>
        ENTRANCE
      </div>

      <Cage color="red" />

      {bombs.map(bomb =>
        bomb.status === "sorted" ? null : (() => {
          const timeLeft = BOMB_TTL - (nowMs - bomb.spawnedAt);
          const isWarning = bomb.status === "active" && timeLeft <= WARNING_WINDOW;
          const blinkOn = isWarning && Math.floor(nowMs / BLINK_INTERVAL) % 2 === 0;

          return (
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
                opacity:         blinkOn ? 0.3 : 1,
                boxShadow:       isWarning ? '0 0 16px 5px rgba(255, 90, 0, 0.9)' : 'none',
                outline:         isWarning ? '2px solid rgba(255,165,0,0.95)' : 'none',
                outlineOffset:   '2px',
              }}
            />
          );
        })()
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

      {/* スコア */}
      <div style={{
        position: 'absolute', top: 8, right: 8,
        color: 'white', fontSize: 18, fontWeight: 'bold',
        zIndex: 30, textShadow: '1px 1px 2px black',
      }}>
        SCORE: {score}
      </div>

      {/* ゲームオーバー：爆発が全て終わってから表示 */}
      {showGameOver && (
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