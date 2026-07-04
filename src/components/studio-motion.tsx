'use client'

import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'

/** True only in the browser, when the user asks for reduced motion. */
function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/**
 * Counts 0 → `to` the first time it scrolls into view. Jumps straight to the
 * value under `prefers-reduced-motion`. Used by the stat tiles and every card's
 * consistency score.
 */
export function CountUp({
  to,
  duration = 1000,
  className,
}: {
  to: number
  duration?: number
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const [value, setValue] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (prefersReducedMotion()) {
      // Jump to the value, but off the effect body (a frame later) to avoid a
      // synchronous setState during the effect.
      const id = requestAnimationFrame(() => setValue(to))
      return () => cancelAnimationFrame(id)
    }

    let raf = 0
    const run = () => {
      const start = performance.now()
      const tick = (now: number) => {
        const p = Math.min(1, (now - start) / duration)
        setValue(Math.round(p * to))
        if (p < 1) raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            run()
            io.disconnect()
            break
          }
        }
      },
      { threshold: 0.2 }
    )
    io.observe(el)

    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [to, duration])

  return (
    <span ref={ref} className={className}>
      {value}
    </span>
  )
}

/**
 * Wraps children in a `.obs` element that reveals (gains `.in`) the first time
 * it scrolls into view. Under reduced motion it renders shown immediately.
 */
export function Reveal({
  children,
  className,
  style,
}: {
  children: ReactNode
  className?: string
  style?: CSSProperties
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (prefersReducedMotion()) {
      const id = requestAnimationFrame(() => setShown(true))
      return () => cancelAnimationFrame(id)
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true)
            io.disconnect()
            break
          }
        }
      },
      { threshold: 0.15 }
    )
    io.observe(el)

    return () => io.disconnect()
  }, [])

  const classes = ['obs', shown ? 'in' : '', className].filter(Boolean).join(' ')

  return (
    <div ref={ref} className={classes} style={style}>
      {children}
    </div>
  )
}
