"use client";
import { useEffect, useRef } from "react";
import { Bomb } from "../types/game";


export default function BombGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bombsRef = useRef<Bomb[]>([]);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 高解像度ディスプレイ（Retina等）への対応
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.scale(dpr, dpr);

    // テスト用のボムを生成
    bombsRef.current = [
      { id: "1", x: 100, y: 100, vx: 2, vy: 2, radius: 25, color: "black" },
      { id: "2", x: 200, y: 200, vx: -2, vy: 1, radius: 25, color: "red" },
    ];

    const update = () => {
      bombsRef.current.forEach(bomb => {
        // 1フレームごとの位置更新
        bomb.x += bomb.vx;
        bomb.y += bomb.vy;

        // 壁での跳ね返り判定
        if (bomb.x - bomb.radius < 0 || bomb.x + bomb.radius > window.innerWidth) bomb.vx *= -1;
        if (bomb.y - bomb.radius < 0 || bomb.y + bomb.radius > window.innerHeight) bomb.vy *= -1;
      });
    };

    const draw = () => {
      // 画面をクリア
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      // ボムの描画
      bombsRef.current.forEach(bomb => {
        ctx.beginPath();
        ctx.arc(bomb.x, bomb.y, bomb.radius, 0, Math.PI * 2);
        ctx.fillStyle = bomb.color === "black" ? "#222" : "#e11";
        ctx.fill();
        ctx.closePath();
      });
    };

    const render = () => {
      update();
      draw();
      requestAnimationFrame(render);
    };

    const animationId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationId);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full bg-slate-100 touch-none"
    />
  );
}