"use client";

import { useEffect, useRef } from "react";

const DENSITY = 7000;
const CONNECTION_DIST = 90;
const REPEL_RADIUS = 180;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  tier: 0 | 1 | 2; // 0 = dim small  1 = medium  2 = bright accent
  phase: number;     // twinkling offset
  phaseSpeed: number;
  baseAlpha: number;
}

export function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Parallax: translate canvas down as page scrolls (stars drift slower than content)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onScroll = () => {
      canvas.style.transform = `translateY(${window.scrollY * 0.55}px)`;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let frame = 0;
    const mouse = { x: -9999, y: -9999 };
    let particles: Particle[] = [];
    let W = 0;
    let H = 0;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas!.offsetWidth;
      H = canvas!.offsetHeight;
      canvas!.width = W * dpr;
      canvas!.height = H * dpr;
      ctx!.scale(dpr, dpr);
      init();
    }

    function init() {
      const count = Math.floor((W * H) / DENSITY);
      particles = Array.from({ length: count }, () => {
        const rand = Math.random();
        // ~68% tiny dim, ~27% medium, ~5% bright accent
        const tier: 0 | 1 | 2 = rand < 0.68 ? 0 : rand < 0.95 ? 1 : 2;

        const r =
          tier === 0 ? Math.random() * 0.8 + 0.25 :
          tier === 1 ? Math.random() * 1.0 + 1.1 :
                       Math.random() * 1.4 + 2.2;

        const baseAlpha =
          tier === 0 ? Math.random() * 0.20 + 0.18 :
          tier === 1 ? Math.random() * 0.25 + 0.40 :
                       Math.random() * 0.15 + 0.75;

        return {
          x: Math.random() * W,
          y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.10,
          vy: (Math.random() - 0.5) * 0.10,
          r,
          tier,
          phase: Math.random() * Math.PI * 2,
          // tier 2 twinkle faster, tier 0 almost static
          phaseSpeed:
            tier === 2 ? Math.random() * 0.018 + 0.010 :
            tier === 1 ? Math.random() * 0.010 + 0.004 :
                         Math.random() * 0.004 + 0.001,
          baseAlpha,
        };
      });
    }

    function drawGlow(x: number, y: number, r: number, alpha: number) {
      const grd = ctx!.createRadialGradient(x, y, 0, x, y, r * 5);
      grd.addColorStop(0, `rgba(180,174,255,${alpha * 0.5})`);
      grd.addColorStop(0.35, `rgba(140,134,230,${alpha * 0.18})`);
      grd.addColorStop(1, "rgba(127,119,221,0)");
      ctx!.fillStyle = grd;
      ctx!.beginPath();
      ctx!.arc(x, y, r * 5, 0, Math.PI * 2);
      ctx!.fill();
    }

    function tick() {
      ctx!.clearRect(0, 0, W, H);
      frame++;

      const mx = mouse.x;
      const my = mouse.y;

      // Subtle mouse glow
      if (mx > 0) {
        const grd = ctx!.createRadialGradient(mx, my, 0, mx, my, 170);
        grd.addColorStop(0, "rgba(83,74,183,0.06)");
        grd.addColorStop(1, "rgba(83,74,183,0)");
        ctx!.fillStyle = grd;
        ctx!.fillRect(0, 0, W, H);
      }

      // Draw glows first (behind everything)
      for (const p of particles) {
        if (p.tier === 2) {
          const twinkle = Math.sin(frame * p.phaseSpeed + p.phase);
          const alpha = p.baseAlpha + twinkle * 0.18;
          drawGlow(p.x, p.y, p.r, alpha);
        }
      }

      for (const p of particles) {
        // Gentle mouse repulsion
        const dx = mx - p.x;
        const dy = my - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < REPEL_RADIUS && dist > 0) {
          const force = (1 - dist / REPEL_RADIUS) * 0.22;
          p.x -= (dx / dist) * force;
          p.y -= (dy / dist) * force;
        }

        p.vx *= 0.999;
        p.vy *= 0.999;
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = W;
        else if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H;
        else if (p.y > H) p.y = 0;

        // Twinkling alpha
        const twinkle = Math.sin(frame * p.phaseSpeed + p.phase);
        const alpha = Math.max(0.05, p.baseAlpha + twinkle * (p.tier === 2 ? 0.20 : p.tier === 1 ? 0.10 : 0.05));

        // Color: tier 2 slightly warmer/brighter white, tier 1 violet, tier 0 dim violet
        const color =
          p.tier === 2 ? `rgba(220,218,255,${alpha})` :
          p.tier === 1 ? `rgba(160,154,235,${alpha})` :
                         `rgba(127,119,221,${alpha})`;

        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx!.fillStyle = color;
        ctx!.fill();

        // Crisp inner highlight on tier 2
        if (p.tier === 2) {
          ctx!.beginPath();
          ctx!.arc(p.x, p.y, p.r * 0.4, 0, Math.PI * 2);
          ctx!.fillStyle = `rgba(255,255,255,${alpha * 0.6})`;
          ctx!.fill();
        }
      }

      // Connections — only between nearby particles
      ctx!.lineWidth = 0.55;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distSq = dx * dx + dy * dy;
          if (distSq < CONNECTION_DIST * CONNECTION_DIST) {
            const alpha = (1 - Math.sqrt(distSq) / CONNECTION_DIST) * 0.22;
            ctx!.strokeStyle = `rgba(147,140,235,${alpha})`;
            ctx!.beginPath();
            ctx!.moveTo(particles[i].x, particles[i].y);
            ctx!.lineTo(particles[j].x, particles[j].y);
            ctx!.stroke();
          }
        }
      }

      animId = requestAnimationFrame(tick);
    }

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas!.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };
    const onMouseLeave = () => {
      mouse.x = -9999;
      mouse.y = -9999;
    };

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();
    tick();

    const section = canvas.parentElement;
    section?.addEventListener("mousemove", onMouseMove);
    section?.addEventListener("mouseleave", onMouseLeave);

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
      section?.removeEventListener("mousemove", onMouseMove);
      section?.removeEventListener("mouseleave", onMouseLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ willChange: "transform" }}
    />
  );
}
