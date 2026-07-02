'use client'

import { useEffect, useRef, useState } from 'react'

/** Right-side plate rail: section id → roman numeral. */
const RAIL: [id: string, roman: string][] = [
  ['specimen', 'I'],
  ['report', 'II'],
  ['demo', 'III'],
  ['archetypes', 'IV'],
  ['process', 'V'],
  ['features', 'VI'],
  ['studio', 'VII'],
]

/** Count an element's text from 0 → `to` over `dur` ms. */
function countNum(el: HTMLElement, to: number, dur: number) {
  const t0 = performance.now()
  const step = (t: number) => {
    const p = Math.min(1, (t - t0) / dur)
    el.textContent = String(Math.round(p * to))
    if (p < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}

/**
 * The fancy interaction layer, mounted once by the page. Dependency-free; queries
 * the DOM after mount, mirroring the prototype's final script. Everything is
 * gated on `prefers-reduced-motion`:
 *  - a scroll-progress DNA strand,
 *  - cursor tilt on the hero glass card,
 *  - count-ups for `.countup[data-to]` when scrolled into view,
 *  - a sticky Plate rail (I–VII) with active-section highlighting,
 *  - magnetic buttons, and
 *  - an intro Æ-monogram veil that lifts (~1.45s, click/enter to dismiss).
 */
export function FancyLayer() {
  const [introUp, setIntroUp] = useState(false)
  const [introGone, setIntroGone] = useState(false)
  const strandRef = useRef<HTMLDivElement>(null)
  const railRef = useRef<HTMLDivElement>(null)

  function dismissIntro() {
    setIntroUp(true)
    window.setTimeout(() => setIntroGone(true), 700)
  }

  useEffect(() => {
    const rm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    // Cursor-driven effects (tilt, magnetic) only make sense with a fine hover
    // pointer; on touch they simply don't attach.
    const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    const cleanups: (() => void)[] = []
    const timers: number[] = []

    // Scroll-progress strand.
    const onScroll = () => {
      const h = document.documentElement
      const denom = h.scrollHeight - h.clientHeight || 1
      if (strandRef.current) {
        strandRef.current.style.width = Math.min(1, h.scrollTop / denom) * 100 + '%'
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    cleanups.push(() => window.removeEventListener('scroll', onScroll))
    onScroll()

    if (!rm && canHover) {
      // Hero glass tilt.
      const stg = document.querySelector<HTMLElement>('.specimen-stage')
      const card = document.querySelector<HTMLElement>('.spec-card')
      if (stg && card) {
        const onMove = (e: MouseEvent) => {
          const r = stg.getBoundingClientRect()
          const x = (e.clientX - r.left) / r.width - 0.5
          const y = (e.clientY - r.top) / r.height - 0.5
          card.style.transform =
            'rotate(-1.4deg) rotateY(' +
            (x * 8).toFixed(2) +
            'deg) rotateX(' +
            (-y * 8).toFixed(2) +
            'deg)'
        }
        const onLeave = () => {
          card.style.transform = 'rotate(-1.4deg)'
        }
        stg.addEventListener('mousemove', onMove)
        stg.addEventListener('mouseleave', onLeave)
        cleanups.push(() => {
          stg.removeEventListener('mousemove', onMove)
          stg.removeEventListener('mouseleave', onLeave)
        })
      }

      // Magnetic buttons.
      const mags = document.querySelectorAll<HTMLElement>('.btn-primary, .nav-cta')
      mags.forEach((b) => {
        const onMove = (e: MouseEvent) => {
          const r = b.getBoundingClientRect()
          const x = (e.clientX - r.left) / r.width - 0.5
          const y = (e.clientY - r.top) / r.height - 0.5
          b.style.transform =
            'translate(' + (x * 6).toFixed(1) + 'px,' + (y * 6).toFixed(1) + 'px)'
        }
        const onLeave = () => {
          b.style.transform = ''
        }
        b.addEventListener('mousemove', onMove)
        b.addEventListener('mouseleave', onLeave)
        cleanups.push(() => {
          b.removeEventListener('mousemove', onMove)
          b.removeEventListener('mouseleave', onLeave)
        })
      })
    }

    // Count-ups.
    const cuIO = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const el = e.target as HTMLElement
            countNum(el, Number(el.dataset.to), 1100)
            cuIO.unobserve(el)
          }
        }),
      { threshold: 0.6 },
    )
    document.querySelectorAll<HTMLElement>('.countup').forEach((el) => {
      if (rm) el.textContent = el.dataset.to ?? el.textContent
      else cuIO.observe(el)
    })
    cleanups.push(() => cuIO.disconnect())

    // Plate rail active-section highlight.
    const dots = railRef.current
      ? Array.from(railRef.current.querySelectorAll<HTMLElement>('.pr-dot'))
      : []
    const secIO = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            dots.forEach((d) => d.classList.toggle('active', d.dataset.id === e.target.id))
          }
        }),
      { threshold: 0.5 },
    )
    RAIL.forEach(([id]) => {
      const s = document.getElementById(id)
      if (s) secIO.observe(s)
    })
    cleanups.push(() => secIO.disconnect())

    // Scroll-reveal for `.obs` elements.
    const obsIO = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in')
            obsIO.unobserve(e.target)
          }
        }),
      { threshold: 0.15 },
    )
    document.querySelectorAll('.obs').forEach((el) => obsIO.observe(el))
    cleanups.push(() => obsIO.disconnect())

    // Intro veil — lift after ~1.45s, then unmount. Under reduced motion it is
    // never scheduled; CSS (`.landing #intro { display: none }`) hides it.
    if (!rm) {
      timers.push(
        window.setTimeout(() => {
          setIntroUp(true)
          timers.push(window.setTimeout(() => setIntroGone(true), 700))
        }, 1450),
      )
    }

    return () => {
      cleanups.forEach((fn) => fn())
      timers.forEach((t) => clearTimeout(t))
    }
  }, [])

  return (
    <>
      <div id="scrollstrand" ref={strandRef} />

      <div id="plate-rail" ref={railRef} aria-hidden="true">
        {RAIL.map(([id, roman]) => (
          <a key={id} href={'#' + id} className="pr-dot" data-id={id}>
            <span className="t">{roman}</span>
            <span className="d" />
          </a>
        ))}
      </div>

      {!introGone && (
        <div
          id="intro"
          className={introUp ? 'lift' : ''}
          role="button"
          tabIndex={0}
          aria-label="Dismiss intro"
          onClick={dismissIntro}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') dismissIntro()
          }}
        >
          <div className="intro-mark">
            <span className="intro-ae">Æ</span>
            <span className="intro-wm">Aesthete</span>
            <div className="intro-strand">
              <i />
              <i />
              <i />
              <i />
              <i />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
