"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

interface Props {
  src: string;
  alt: string;
  blurDataURL: string;
  badge?: string;
}

export function ImageLightbox({ src, alt, blurDataURL, badge }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <div
        className="relative w-full overflow-hidden rounded-2xl border aspect-[4/3] md:aspect-video"
        style={{
          backgroundColor: "#101010",
          borderColor: "rgba(255,255,255,0.06)",
          cursor: "zoom-in",
        }}
        onClick={() => setOpen(true)}
      >
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 768px) 100vw, 1152px"
          quality={95}
          className="object-cover"
          placeholder="blur"
          blurDataURL={blurDataURL}
          priority
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/30 via-transparent to-transparent" />
        {badge && (
          <div className="absolute left-5 top-5 md:left-7 md:top-7">
            <span
              className="rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.22em]"
              style={{
                color: "#7F77DD",
                backgroundColor: "rgba(127,119,221,0.15)",
                border: "1px solid rgba(127,119,221,0.25)",
                fontFamily: "var(--font-dm-sans)",
              }}
            >
              {badge}
            </span>
          </div>
        )}
        {/* expand hint */}
        <div className="absolute bottom-4 right-4 opacity-40 transition-opacity group-hover:opacity-80">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 3h6m0 0v6m0-6-7 7M9 21H3m0 0v-6m0 6 7-7" />
          </svg>
        </div>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10"
          style={{ backgroundColor: "rgba(0,0,0,0.93)", backdropFilter: "blur(10px)" }}
          onClick={() => setOpen(false)}
          data-cursor="light"
        >
          <div
            className="relative w-full max-w-6xl rounded-xl overflow-hidden"
            style={{ aspectRatio: "16/9" }}
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={src}
              alt={alt}
              fill
              sizes="100vw"
              quality={95}
              className="object-contain"
              placeholder="blur"
              blurDataURL={blurDataURL}
            />
          </div>
          <button
            className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full transition-colors"
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.15)",
              color: "rgba(255,255,255,0.7)",
            }}
            onClick={() => setOpen(false)}
            aria-label="Schließen"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </>
  );
}
