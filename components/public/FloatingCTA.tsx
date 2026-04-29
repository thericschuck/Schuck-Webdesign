'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'

export function FloatingCTA() {
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)

  // Show after scrolling past the hero
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 300)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Hide on contact page — no point asking to contact while already there
  if (pathname === '/kontakt') return null

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.94 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="fixed bottom-6 right-5 z-50"
        >
          <Link
            href="/kontakt"
            className="group flex items-center gap-2.5 bg-[#F5F5F0] text-[#080808] pl-5 pr-4 py-3 rounded-full text-sm font-semibold shadow-[0_4px_24px_rgba(0,0,0,0.22)] hover:bg-white hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(0,0,0,0.28)] transition-all duration-200"
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            Jetzt anfragen
            <span className="w-6 h-6 rounded-full bg-[#1C1C1E] flex items-center justify-center transition-colors duration-200 group-hover:bg-[#7F77DD]">
              <svg
                width="11"
                height="11"
                fill="none"
                stroke="white"
                strokeWidth={2.2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17 8l4 4m0 0l-4 4m4-4H3"
                />
              </svg>
            </span>
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
