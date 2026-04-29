'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'

type ReviewRow = {
  id: string
  rating: number
  text: string
  reviewer_name: string | null
  reviewer_company: string | null
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <svg
          key={n}
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill={n <= rating ? '#7F77DD' : 'none'}
          stroke={n <= rating ? '#7F77DD' : 'rgba(127,119,221,0.22)'}
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
          />
        </svg>
      ))}
    </div>
  )
}

const BTN_STYLE = {
  background: 'rgba(255,255,255,0.10)',
  border: '1px solid rgba(255,255,255,0.22)',
  backdropFilter: 'blur(8px)',
} as const

const BTN_HOVER = {
  background: 'rgba(255,255,255,0.18)',
  border: '1px solid rgba(255,255,255,0.45)',
} as const

function NavBtn({
  dir,
  onClick,
  size = 'md',
}: {
  dir: 'prev' | 'next'
  onClick: () => void
  size?: 'sm' | 'md'
}) {
  const [hovered, setHovered] = useState(false)
  const dim = size === 'sm' ? 'w-10 h-10' : 'w-11 h-11'
  return (
    <button
      onClick={onClick}
      aria-label={dir === 'prev' ? 'Vorherige Bewertung' : 'Nächste Bewertung'}
      className={`shrink-0 ${dim} rounded-full flex items-center justify-center transition-all duration-200`}
      style={hovered ? BTN_HOVER : BTN_STYLE}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <svg
        width="15"
        height="15"
        fill="none"
        stroke="rgba(255,255,255,0.85)"
        strokeWidth={2.2}
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d={dir === 'prev' ? 'M15 19l-7-7 7-7' : 'M9 5l7 7-7 7'}
        />
      </svg>
    </button>
  )
}

const SLIDE_DURATION = 0.38
const SLIDE_EASE = [0.32, 0.72, 0, 1]

export function TestimonialsCarousel() {
  const [reviews, setReviews] = useState<ReviewRow[]>([])
  const [idx, setIdx] = useState(0)
  const [dir, setDir] = useState<1 | -1>(1)
  const [loaded, setLoaded] = useState(false)
  const animating = useRef(false)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('reviews')
      .select('id, rating, text, reviewer_name, reviewer_company')
      .eq('status', 'approved')
      .eq('published', true)
      .order('approved_at', { ascending: false })
      .then(({ data }) => {
        if (data) setReviews(data as ReviewRow[])
        setLoaded(true)
      })
  }, [])

  function go(direction: 1 | -1) {
    if (animating.current || reviews.length <= 1) return
    animating.current = true
    setDir(direction)
    setIdx((i) => (i + direction + reviews.length) % reviews.length)
    setTimeout(() => {
      animating.current = false
    }, SLIDE_DURATION * 1000 + 50)
  }

  if (!loaded || reviews.length === 0) return null

  const r = reviews[idx]
  const hasMultiple = reviews.length > 1

  const dots = hasMultiple ? (
    <div className="flex items-center gap-2">
      {reviews.map((_, i) => (
        <button
          key={i}
          onClick={() => go(i > idx ? 1 : -1)}
          aria-label={`Bewertung ${i + 1}`}
          className="transition-all duration-300"
          style={{
            width: i === idx ? '18px' : '6px',
            height: '6px',
            borderRadius: '99px',
            background:
              i === idx ? '#7F77DD' : 'rgba(255,255,255,0.18)',
          }}
        />
      ))}
    </div>
  ) : null

  return (
    <div className="w-full">
      {/* ── Desktop: [←] [card] [→] ─────────────────────────────────────── */}
      <div className="flex items-center gap-6 md:gap-7">
        {/* Prev — desktop only */}
        {hasMultiple && (
          <div className="hidden md:block">
            <NavBtn dir="prev" onClick={() => go(-1)} />
          </div>
        )}

        {/* Card */}
        <div className="flex-1 overflow-hidden rounded-2xl">
          <AnimatePresence initial={false} custom={dir} mode="popLayout">
            <motion.div
              key={idx}
              custom={dir}
              initial={{ x: `${dir * 55}%`, opacity: 0 }}
              animate={{ x: '0%', opacity: 1 }}
              exit={{ x: `${dir * -55}%`, opacity: 0 }}
              transition={{ duration: SLIDE_DURATION, ease: SLIDE_EASE }}
              className="w-full bg-[#0f0f0f] border border-white/[0.07] px-6 pt-7 pb-6 md:px-8 md:pt-8 md:pb-7 flex flex-col gap-4"
              style={{ boxShadow: '0 0 60px rgba(127,119,221,0.04)' }}
            >
              <Stars rating={r.rating} />
              <span
                className="text-[44px] leading-none text-[#7F77DD]/15 select-none -mb-2"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                "
              </span>
              <p
                className="text-sm md:text-base text-[#999] leading-relaxed"
                style={{ fontFamily: 'var(--font-dm-sans)' }}
              >
                {r.text}
              </p>
              <div className="border-t border-white/[0.07] pt-4 mt-1">
                <p
                  className="text-sm font-semibold text-[#E8E8E4]"
                  style={{ fontFamily: 'var(--font-dm-sans)' }}
                >
                  {r.reviewer_name ?? 'Kunde'}
                </p>
                {r.reviewer_company && (
                  <p
                    className="text-xs text-[#555] mt-0.5"
                    style={{ fontFamily: 'var(--font-dm-sans)' }}
                  >
                    {r.reviewer_company}
                  </p>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Next — desktop only */}
        {hasMultiple && (
          <div className="hidden md:block">
            <NavBtn dir="next" onClick={() => go(1)} />
          </div>
        )}
      </div>

      {/* ── Desktop dots ────────────────────────────────────────────────── */}
      {hasMultiple && (
        <div className="hidden md:flex justify-center mt-5">
          {dots}
        </div>
      )}

      {/* ── Mobile controls: [←] [dots] [→] below card ──────────────────── */}
      {hasMultiple && (
        <div className="flex md:hidden items-center justify-between mt-4">
          <NavBtn dir="prev" onClick={() => go(-1)} size="sm" />
          {dots}
          <NavBtn dir="next" onClick={() => go(1)} size="sm" />
        </div>
      )}
    </div>
  )
}
