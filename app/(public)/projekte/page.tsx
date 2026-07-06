"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { FadeIn } from "@/components/public/FadeIn";
import { projects } from "./projects-data";

function ShootingStarsBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrame = 0;
    let width = 0;
    let height = 0;
    let stars: { x: number; y: number; r: number; a: number }[] = [];
    let shootingStars: {
      x: number;
      y: number;
      angle: number;
      speed: number;
      length: number;
      width: number;
      life: number;
      decay: number;
      color: string;
    }[] = [];

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      width = parent.clientWidth;
      height = parent.clientHeight;
      canvas.width = width;
      canvas.height = height;

      stars = Array.from({ length: 55 }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 0.9 + 0.2,
        a: Math.random() * 0.22 + 0.04,
      }));
    };

    const spawnShootingStar = () => {
      if (Math.random() > 0.018) return;
      const fromTop = Math.random() < 0.7;
      const x = fromTop ? Math.random() * width * 1.2 - width * 0.1 : -20;
      const y = fromTop ? -20 : Math.random() * height * 0.6;
      const angle = fromTop
        ? Math.PI / 4 + (Math.random() - 0.5) * 0.4
        : (Math.random() - 0.5) * 0.25;

      shootingStars.push({
        x,
        y,
        angle,
        speed: 3 + Math.random() * 2.2,
        length: 70 + Math.random() * 55,
        width: 1 + Math.random() * 0.7,
        life: 1,
        decay: 0.012 + Math.random() * 0.008,
        color: Math.random() < 0.35 ? "127,119,221" : "235,235,245",
      });
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      for (const star of stars) {
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200,200,230,${star.a})`;
        ctx.fill();
      }

      spawnShootingStar();
      shootingStars = shootingStars.filter((star) => star.life > 0);

      for (const star of shootingStars) {
        const dx = Math.cos(star.angle) * star.speed;
        const dy = Math.sin(star.angle) * star.speed;
        star.x += dx;
        star.y += dy;
        star.life -= star.decay;

        if (star.life <= 0) continue;

        const tailX = star.x - Math.cos(star.angle) * star.length;
        const tailY = star.y - Math.sin(star.angle) * star.length;
        const gradient = ctx.createLinearGradient(tailX, tailY, star.x, star.y);
        gradient.addColorStop(0, `rgba(${star.color},0)`);
        gradient.addColorStop(0.6, `rgba(${star.color},${star.life * 0.12})`);
        gradient.addColorStop(1, `rgba(${star.color},${star.life * 0.7})`);

        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(star.x, star.y);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = star.width * star.life;
        ctx.lineCap = "round";
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(star.x, star.y, star.width * 1.35 * star.life, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${star.color},${star.life * 0.65})`;
        ctx.fill();
      }

      animationFrame = window.requestAnimationFrame(draw);
    };

    resize();
    draw();
    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      window.cancelAnimationFrame(animationFrame);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full pointer-events-none"
      aria-hidden
    />
  );
}

export default function ProjektePage() {
  return (
    <main>
      <section
        style={{ backgroundColor: "#080808" }}
        className="relative overflow-hidden px-6 pb-16 pt-36 md:px-12"
      >
        <ShootingStarsBackground />
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 70% 55% at 50% 32%, rgba(127,119,221,0.05) 0%, transparent 72%)",
          }}
        />
        <div className="mx-auto max-w-6xl">
          <FadeIn delay={0}>
            <span
              className="mb-6 inline-block rounded-full px-3 py-1 text-xs font-medium uppercase tracking-widest"
              style={{
                color: "#7F77DD",
                backgroundColor: "rgba(127, 119, 221, 0.1)",
                border: "1px solid rgba(127, 119, 221, 0.2)",
              }}
            >
              Ausgewählte Projekte
            </span>
          </FadeIn>
          <FadeIn delay={0.08}>
            <h1
              className="mb-5 text-4xl font-normal leading-tight md:text-6xl lg:text-7xl"
              style={{
                fontFamily: "var(--font-fraunces)",
                color: "#F5F5F0",
              }}
            >
              Ausgewählte Projekte, unterschiedliche Rollen.
            </h1>
          </FadeIn>
          <FadeIn delay={0.14}>
            <p
              className="max-w-2xl text-base md:text-lg"
              style={{
                fontFamily: "var(--font-dm-sans)",
                color: "#666",
              }}
            >
              Jedes Projekt hat ein anderes Ziel – hier sieht man,
              wie unterschiedlich ein Webauftritt je nach Aufgabe funktionieren muss.
            </p>
          </FadeIn>
        </div>
      </section>

      <section
        style={{ backgroundColor: "#0b0b0b" }}
        className="px-6 py-16 md:px-12"
      >
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project, i) => (
            <FadeIn key={project.slug} delay={i * 0.05}>
              <Link
                href={`/projekte/${project.slug}`}
                className="group flex flex-col gap-3 transition-transform duration-300 ease-out hover:-translate-y-1.5"
              >
                <div className="relative aspect-video overflow-hidden rounded-xl border border-white/[0.07] bg-[#101010]">
                  <Image
                    src={project.image}
                    alt={project.name}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                    quality={95}
                    className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                    placeholder="blur"
                    blurDataURL={project.blurDataURL}
                    priority={i === 0}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-black/10 transition-opacity duration-300 group-hover:opacity-90" />
                  <div className="absolute left-3 top-3 z-20">
                    <p
                      className="text-[11px] uppercase tracking-[0.28em]"
                      style={{
                        color: "rgba(245,245,240,0.42)",
                        fontFamily: "var(--font-dm-sans)",
                      }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </p>
                  </div>
                  <div className="absolute bottom-3 left-3 z-20 flex max-w-[calc(100%-4.25rem)] flex-col items-start gap-2">
                    <p
                      className="text-xs md:text-sm"
                      style={{
                        color: "rgba(245,245,240,0.62)",
                        fontFamily: "var(--font-dm-sans)",
                      }}
                    >
                      {project.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                    </p>
                    <span
                      className="rounded-full px-2.5 py-1 text-xs font-semibold backdrop-blur-sm"
                      style={{
                        color: "#E3E1FB",
                        backgroundColor: "rgba(23, 20, 45, 0.82)",
                        border: "1px solid rgba(154, 146, 235, 0.5)",
                        fontFamily: "var(--font-dm-sans)",
                      }}
                    >
                      {project.category}
                    </span>
                  </div>
                  <div className="absolute bottom-3 right-3 z-20 translate-x-[-8px] opacity-0 transition-all duration-300 ease-out group-hover:translate-x-0 group-hover:opacity-100">
                    <svg
                      className="h-4 w-4 text-white/70"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.5}
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M17 8l4 4m0 0l-4 4m4-4H3"
                      />
                    </svg>
                  </div>
                </div>

                <div className="flex flex-col gap-1 px-0.5">
                  <p
                    className="text-sm font-semibold transition-colors duration-200 group-hover:text-white"
                    style={{
                      color: "#F5F5F0",
                      fontFamily: "var(--font-dm-sans)",
                    }}
                  >
                    {project.name}
                  </p>
                  <p
                    className="text-sm"
                    style={{
                      color: "#555",
                      fontFamily: "var(--font-dm-sans)",
                    }}
                  >
                    {project.shortDesc}
                  </p>
                </div>
              </Link>
            </FadeIn>
          ))}
        </div>
      </section>
    </main>
  );
}
