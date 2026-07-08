"use client";

// The JARVIS holographic globe — Iron-Man-HUD style: a rotating wireframe
// sphere of cyan points with orbital rings and scanning arcs, rendered on
// a 2D canvas (no extra deps). It reacts to the assistant's state:
//   idle      slow rotation, calm glow
//   listening breathing pulse rings
//   thinking  fast spin + sweeping radar arc
//   speaking  waveform ring modulation

import { useEffect, useRef } from "react";

export type GlobeState = "idle" | "listening" | "thinking" | "speaking";

const CYAN = { r: 64, g: 200, b: 255 };
const rgba = (a: number) => `rgba(${CYAN.r},${CYAN.g},${CYAN.b},${a})`;

export function JarvisGlobe({ state, size = 280 }: { state: GlobeState; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GlobeState>(state);
  stateRef.current = state;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let raf = 0;

    // sphere point lattice (lat/long grid)
    const pts: { lat: number; lon: number }[] = [];
    for (let lat = -80; lat <= 80; lat += 10) {
      const n = Math.max(6, Math.round(28 * Math.cos((lat * Math.PI) / 180)));
      for (let i = 0; i < n; i++) pts.push({ lat: (lat * Math.PI) / 180, lon: (i / n) * Math.PI * 2 });
    }

    let rot = 0;
    let last = performance.now();

    const draw = (now: number) => {
      const st = stateRef.current;
      const dt = Math.min(50, now - last);
      last = now;
      const speed = st === "thinking" ? 0.0011 : st === "speaking" ? 0.0005 : 0.00028;
      rot += speed * dt;

      const S = size;
      canvas.width = S * dpr;
      canvas.height = S * dpr;
      const g = canvas.getContext("2d")!;
      g.scale(dpr, dpr);
      g.clearRect(0, 0, S, S);
      const C = S / 2;
      const R = S * 0.30;
      const tilt = 0.42;

      // ambient core glow
      const glow = g.createRadialGradient(C, C, 0, C, C, R * 1.6);
      const glowA = st === "idle" ? 0.10 : 0.17;
      glow.addColorStop(0, rgba(glowA));
      glow.addColorStop(0.6, rgba(glowA * 0.4));
      glow.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = glow;
      g.fillRect(0, 0, S, S);

      // sphere points (rotate lon, tilt X, orthographic project)
      for (const p of pts) {
        const lon = p.lon + rot;
        let x = Math.cos(p.lat) * Math.sin(lon);
        let y = Math.sin(p.lat);
        let z = Math.cos(p.lat) * Math.cos(lon);
        const y2 = y * Math.cos(tilt) - z * Math.sin(tilt);
        const z2 = y * Math.sin(tilt) + z * Math.cos(tilt);
        y = y2; z = z2;
        const depth = (z + 1) / 2; // 0 back → 1 front
        const a = 0.08 + depth * 0.75;
        const r = 0.6 + depth * 1.15;
        g.fillStyle = rgba(a);
        g.beginPath();
        g.arc(C + x * R, C - y * R, r, 0, 7);
        g.fill();
      }

      // sphere rim
      g.strokeStyle = rgba(0.35);
      g.lineWidth = 1;
      g.beginPath();
      g.arc(C, C, R, 0, 7);
      g.stroke();

      // orbital rings (static ellipses, HUD feel)
      g.strokeStyle = rgba(0.22);
      for (const [rx, ry, tiltDeg] of [[1.32, 0.42, -18], [1.5, 0.32, 12]] as const) {
        g.save();
        g.translate(C, C);
        g.rotate((tiltDeg * Math.PI) / 180);
        g.beginPath();
        g.ellipse(0, 0, R * rx, R * ry, 0, 0, 7);
        g.stroke();
        g.restore();
      }

      // rotating arc segments on the outer ring
      const arcR = R * 1.62;
      g.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        const start = rot * (st === "thinking" ? 3 : 1.4) + (i * Math.PI * 2) / 3;
        g.strokeStyle = rgba(0.5);
        g.beginPath();
        g.arc(C, C, arcR, start, start + 0.7);
        g.stroke();
      }

      // state effects
      if (st === "listening") {
        const pulse = (now % 1600) / 1600;
        g.strokeStyle = rgba(0.5 * (1 - pulse));
        g.lineWidth = 1.5;
        g.beginPath();
        g.arc(C, C, R * (1 + pulse * 0.75), 0, 7);
        g.stroke();
      }
      if (st === "thinking") {
        const sweep = (now % 1200) / 1200 * Math.PI * 2;
        const grad = g.createConicGradient?.(sweep, C, C);
        if (grad) {
          grad.addColorStop(0, rgba(0.35));
          grad.addColorStop(0.12, "rgba(0,0,0,0)");
          grad.addColorStop(1, "rgba(0,0,0,0)");
          g.fillStyle = grad;
          g.beginPath();
          g.arc(C, C, R, 0, 7);
          g.fill();
        }
      }
      if (st === "speaking") {
        g.strokeStyle = rgba(0.55);
        g.lineWidth = 1.5;
        g.beginPath();
        const segs = 90;
        for (let i = 0; i <= segs; i++) {
          const ang = (i / segs) * Math.PI * 2;
          const wave = Math.sin(ang * 7 + now / 90) * 0.05 + Math.sin(ang * 13 - now / 70) * 0.03;
          const rr = R * (1.16 + wave);
          const x = C + Math.cos(ang) * rr;
          const y = C + Math.sin(ang) * rr;
          if (i === 0) g.moveTo(x, y);
          else g.lineTo(x, y);
        }
        g.closePath();
        g.stroke();
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [size]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size }}
      className="pointer-events-none select-none"
      aria-hidden
    />
  );
}
