'use client'

import { useEffect, useRef } from 'react'

interface Dot {
  x: number
  y: number
  vx: number
  vy: number
}

const DOT_COUNT = 46
const LINK_DISTANCE = 130
const SPEED = 0.12

/** Rein dekorativer, "netzartiger" Ambient-Effekt hinter dem Workflow-Graphen — keine
 * fachliche Bedeutung, nur Atmosphäre (angelehnt an das Hero-Glow-Ambiente der
 * Landingpage, hier als dezentes, langsam driftendes Punktnetz statt eines Radialverlaufs).
 * Eigenes <canvas> unterhalb von React Flow (pointer-events: none), läuft unabhängig von
 * dessen Zoom/Pan — bewegt sich nicht mit dem Graphen mit, bleibt bewusst reiner Hintergrund. */
export function NetworkBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx2d = canvas.getContext('2d')
    if (!ctx2d) return
    // Eigene, endgültig nicht-null getypte Konstante: `function tick(){}`-Deklarationen sind
    // gehoistet, TS behält die Null-Check-Verengung von `ctx2d` dort nicht bei.
    const ctx = ctx2d

    let width = 0
    let height = 0
    let dots: Dot[] = []
    let raf = 0

    function seedDots() {
      dots = Array.from({ length: DOT_COUNT }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * SPEED,
        vy: (Math.random() - 0.5) * SPEED,
      }))
    }

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      width = entry.contentRect.width
      height = entry.contentRect.height
      const dpr = window.devicePixelRatio || 1
      canvas.width = width * dpr
      canvas.height = height * dpr
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.scale(dpr, dpr)
      if (dots.length === 0) seedDots()
    })
    resizeObserver.observe(canvas.parentElement ?? canvas)

    function tick() {
      ctx.clearRect(0, 0, width, height)
      for (const dot of dots) {
        dot.x += dot.vx
        dot.y += dot.vy
        if (dot.x < 0 || dot.x > width) dot.vx *= -1
        if (dot.y < 0 || dot.y > height) dot.vy *= -1
      }
      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          const a = dots[i]
          const b = dots[j]
          const dist = Math.hypot(a.x - b.x, a.y - b.y)
          if (dist < LINK_DISTANCE) {
            ctx.strokeStyle = `rgba(127,119,221,${0.16 * (1 - dist / LINK_DISTANCE)})`
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.stroke()
          }
        }
      }
      for (const dot of dots) {
        ctx.beginPath()
        ctx.arc(dot.x, dot.y, 1.6, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(155,144,245,0.45)'
        ctx.fill()
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      resizeObserver.disconnect()
    }
  }, [])

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" aria-hidden />
}
