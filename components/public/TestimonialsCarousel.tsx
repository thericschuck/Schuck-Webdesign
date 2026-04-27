'use client'

import { useEffect, useState } from 'react'
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

export function TestimonialsCarousel() {
  const [reviews, setReviews] = useState<ReviewRow[]>([])
  const [idx, setIdx] = useState(0)
  const [loaded, setLoaded] = useState(false)

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

  if (!loaded || reviews.length === 0) return null

  const r = reviews[idx]
  const name = r.reviewer_name ?? 'Kunde'
  const company = r.reviewer_company

  const prev = () => setIdx((i) => (i - 1 + reviews.length) % reviews.length)
  const next = () => setIdx((i) => (i + 1) % reviews.length)

  return (
    <div className="flex flex-col items-center gap-8">
      {/* Card */}
      <div
        className="w-full max-w-2xl mx-auto bg-[#0f0f0f] border border-white/[0.07] rounded-2xl px-10 pt-9 pb-8 flex flex-col gap-5"
        style={{ boxShadow: '0 0 60px rgba(127,119,221,0.035)' }}
      >
        <Stars rating={r.rating} />
        <span
          className="text-[52px] leading-none text-[#7F77DD]/15 select-none -mb-3"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          "
        </span>
        <p
          className="text-base text-[#999] leading-relaxed"
          style={{ fontFamily: 'var(--font-dm-sans)' }}
        >
          {r.text}
        </p>
        <div className="border-t border-white/[0.07] pt-5 mt-1">
          <p
            className="text-sm font-semibold text-[#E8E8E4]"
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            {name}
          </p>
          {company && (
            <p
              className="text-xs text-[#555] mt-0.5"
              style={{ fontFamily: 'var(--font-dm-sans)' }}
            >
              {company}
            </p>
          )}
        </div>
      </div>

      {/* Navigation */}
      {reviews.length > 1 && (
        <div className="flex items-center gap-5">
          <button
            onClick={prev}
            aria-label="Vorherige Bewertung"
            className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center text-white/30 hover:text-white/60 hover:border-white/25 transition-all"
          >
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="flex items-center gap-2">
            {reviews.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                aria-label={`Bewertung ${i + 1}`}
                className="transition-all duration-300"
                style={{
                  width: i === idx ? '18px' : '6px',
                  height: '6px',
                  borderRadius: '99px',
                  background: i === idx ? '#7F77DD' : 'rgba(255,255,255,0.12)',
                }}
              />
            ))}
          </div>

          <button
            onClick={next}
            aria-label="Nächste Bewertung"
            className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center text-white/30 hover:text-white/60 hover:border-white/25 transition-all"
          >
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}
