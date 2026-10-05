import { useEffect, useRef } from "react";

type Dot = { x: number; y: number; vx: number; vy: number; life: number; size: number };

export function Particles({ run }: { run: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!run) return;
    const canvas = ref.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    let frame = 0;
    const dots: Dot[] = Array.from({ length: 70 }, () => spawn(canvas));
    const draw = () => {
      canvas.width = canvas.offsetWidth * devicePixelRatio;
      canvas.height = canvas.offsetHeight * devicePixelRatio;
      context.clearRect(0, 0, canvas.width, canvas.height);
      for (const dot of dots) {
        dot.x += dot.vx;
        dot.y += dot.vy;
        dot.vy += 0.04 * devicePixelRatio;
        dot.life -= 0.008;
        if (dot.life <= 0 || dot.y > canvas.height) Object.assign(dot, spawn(canvas));
        context.globalAlpha = Math.max(dot.life, 0);
        context.fillStyle = "#f0c14e";
        context.beginPath();
        context.arc(dot.x, dot.y, dot.size, 0, Math.PI * 2);
        context.fill();
      }
      context.globalAlpha = 1;
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [run]);

  return <canvas ref={ref} className="pointer-events-none absolute inset-0 h-full w-full" />;
}

function spawn(canvas: HTMLCanvasElement): Dot {
  return {
    x: canvas.offsetWidth * devicePixelRatio * (0.2 + Math.random() * 0.6),
    y: canvas.offsetHeight * devicePixelRatio * 0.7,
    vx: (Math.random() - 0.5) * 3 * devicePixelRatio,
    vy: (-2.5 - Math.random() * 3) * devicePixelRatio,
    life: 1,
    size: (2 + Math.random() * 3) * devicePixelRatio,
  };
}
