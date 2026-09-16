'use client'

import { useEffect, useRef, useState } from 'react'

const LOWER = 'abcdefghijklmnopqrstuvwxyz'
const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const DIGITS = '0123456789'
const SYMBOLS = '!@#$%^&*()-_=+[]{}?'

interface GeneratorOptions {
  length: number
  upper: boolean
  lower: boolean
  digits: boolean
  symbols: boolean
}

function buildPool(opts: GeneratorOptions): string {
  let pool = ''
  if (opts.lower) pool += LOWER
  if (opts.upper) pool += UPPER
  if (opts.digits) pool += DIGITS
  if (opts.symbols) pool += SYMBOLS
  return pool || LOWER + DIGITS
}

/** Kryptografisch zufällig (Web Crypto) statt Math.random — es ist ein Passwort-Generator. */
function generatePassword(opts: GeneratorOptions): string {
  const pool = buildPool(opts)
  const randomValues = crypto.getRandomValues(new Uint32Array(opts.length))
  let out = ''
  for (let i = 0; i < opts.length; i++) {
    out += pool[randomValues[i] % pool.length]
  }
  return out
}

const dmSans = { fontFamily: 'var(--font-dm-sans)' }

export function PasswordGenerator({ onGenerate, disabled }: { onGenerate: (password: string) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false)
  const [length, setLength] = useState(20)
  const [upper, setUpper] = useState(true)
  const [lower, setLower] = useState(true)
  const [digits, setDigits] = useState(true)
  const [symbols, setSymbols] = useState(true)
  const [rolling, setRolling] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)
  const rollTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  useEffect(() => () => {
    if (rollTimer.current) clearInterval(rollTimer.current)
  }, [])

  const roll = () => {
    const opts: GeneratorOptions = { length, upper, lower, digits, symbols }
    setRolling(true)
    if (rollTimer.current) clearInterval(rollTimer.current)

    // Kleiner "Roller"-Effekt: ein paar Frames zufälliger Zeichen, bevor das
    // tatsächliche (kryptografisch zufällige) Passwort im Feld landet.
    let frame = 0
    const totalFrames = 8
    rollTimer.current = setInterval(() => {
      frame++
      onGenerate(generatePassword(opts))
      if (frame >= totalFrames) {
        if (rollTimer.current) clearInterval(rollTimer.current)
        setRolling(false)
      }
    }, 45)
  }

  return (
    <div className="relative inline-flex" ref={popoverRef}>
      <button
        type="button"
        onClick={roll}
        disabled={disabled}
        title="Passwort generieren"
        className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50"
      >
        <svg
          className={`w-4 h-4 transition-transform duration-300 ${rolling ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 3h5v5M4 20L20.2 3.8M21 16v5h-5M4 4l5.5 5.5M4 20v-5h5" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        title="Generator-Einstellungen"
        className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-10 w-64 bg-white border border-gray-200 rounded-xl shadow-lg p-4 flex flex-col gap-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-gray-500" style={dmSans}>
                Länge
              </label>
              <span className="text-xs font-semibold text-gray-700" style={dmSans}>
                {length}
              </span>
            </div>
            <input
              type="range"
              min={8}
              max={64}
              value={length}
              onChange={(e) => setLength(Number(e.target.value))}
              className="w-full accent-gray-900"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            {[
              { key: 'upper', label: 'Großbuchstaben (A-Z)', value: upper, set: setUpper },
              { key: 'lower', label: 'Kleinbuchstaben (a-z)', value: lower, set: setLower },
              { key: 'digits', label: 'Zahlen (0-9)', value: digits, set: setDigits },
              { key: 'symbols', label: 'Sonderzeichen (!@#…)', value: symbols, set: setSymbols },
            ].map((opt) => (
              <label key={opt.key} className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer" style={dmSans}>
                <input
                  type="checkbox"
                  checked={opt.value}
                  onChange={(e) => opt.set(e.target.checked)}
                  className="rounded border-gray-300 accent-gray-900"
                />
                {opt.label}
              </label>
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              roll()
              setOpen(false)
            }}
            className="w-full py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg hover:bg-gray-700 transition-colors"
            style={dmSans}
          >
            Neu würfeln
          </button>
        </div>
      )}
    </div>
  )
}
