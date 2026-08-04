'use client'

import Image from 'next/image'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ARCHETYPES, unsplashSrc } from '@/lib/landing-archetypes'

const DWELL = 5200

/**
 * Plate IV — The Archetypes. An auto-rotating stage cross-fading through the
 * archetypes every ~5.2s, with an amber progress bar, a clickable thumbnail
 * index, and pause-on-hover. Reduced motion disables auto-advance and the bar;
 * thumbnails still switch on click.
 */
export function ArchetypeGallery() {
  const [idx, setIdx] = useState(0)
  const [paused, setPaused] = useState(false)
  const barRef = useRef<HTMLElement>(null)
  const reduceMotion = useRef(false)
  const hoverable = useRef(false)

  useEffect(() => {
    reduceMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    hoverable.current = window.matchMedia('(hover: hover) and (pointer: fine)').matches
  }, [])

  /** Restart the amber fill-bar animation from zero. */
  const runBar = useCallback(() => {
    const bar = barRef.current
    if (!bar) return
    bar.style.animationPlayState = 'running'
    bar.classList.remove('run')
    void bar.offsetWidth
    bar.classList.add('run')
  }, [])

  // Restart the bar whenever the active slide changes.
  useEffect(() => {
    if (reduceMotion.current) return
    runBar()
  }, [idx, runBar])

  // Auto-advance. Re-created on every slide change so each panel gets a full
  // dwell, and on pause/resume. Skipped entirely under reduced motion.
  useEffect(() => {
    if (reduceMotion.current || paused) return
    const id = window.setInterval(
      () => setIdx((i) => (i + 1) % ARCHETYPES.length),
      DWELL,
    )
    return () => clearInterval(id)
  }, [paused, idx])

  function onEnter() {
    // Pause-on-hover only on hover-capable devices; touch keeps it rotating.
    if (!hoverable.current) return
    setPaused(true)
    if (barRef.current) barRef.current.style.animationPlayState = 'paused'
  }
  function onLeave() {
    if (!hoverable.current) return
    setPaused(false)
    runBar()
  }

  return (
    <section
      id="archetypes"
      className="arch-sec"
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      <div className="plate-tag">
        <span className="no">Plate IV</span>
        <span className="rule" />
        <span className="meta">The Archetypes</span>
      </div>
      <div className="arch-head">
        <h2>Every aesthetic resolves to an archetype.</h2>
        <div className="arch-hint">
          <i />
          <span className="meta">Auto-rotating · hover to pause</span>
        </div>
      </div>

      <div className="arch-stage">
        {ARCHETYPES.map((a, i) => (
          <div className={'arch-slide' + (i === idx ? ' active' : '')} key={a.name}>
            {a.photo && (
              <div className="arch-photo">
                <Image
                  src={unsplashSrc(a.photo.id)}
                  alt={a.photo.alt}
                  fill
                  sizes="(max-width: 900px) 100vw, 1160px"
                  className="arch-photo-img"
                  style={a.photo.pos ? { objectPosition: a.photo.pos } : undefined}
                  priority={i === 0}
                />
              </div>
            )}
            <div className="arch-field" style={{ background: a.grade }} />
            <div className="arch-frame" />
            <div className="meta arch-tagtop">
              Archetype No. {String(i + 1).padStart(2, '0')} · DNA
            </div>
            <div className="glass-card arch-info">
              <div className="ai-top">
                <div className="ai-name">{a.name}</div>
                <div className="ai-score">
                  {a.score}
                  <small>Consistency</small>
                </div>
              </div>
              <div className="arch-bands">
                {a.palette.map((c, j) => (
                  <span key={j} style={{ background: c }} />
                ))}
              </div>
              <div className="arch-sig">{a.sig}</div>
              <div className="arch-chips">
                {a.mood.map((m) => (
                  <b key={m}>{m}</b>
                ))}
                <b style={{ borderColor: 'rgba(196,147,58,.45)', color: 'rgba(196,147,58,.95)' }}>
                  {a.tone}
                </b>
              </div>
            </div>
            {a.photo && (
              <span className="arch-credit">Photo by {a.photo.by}</span>
            )}
          </div>
        ))}
        <div className="arch-progress">
          <i ref={barRef} />
        </div>
      </div>

      <div className="arch-thumbs">
        {ARCHETYPES.map((a, i) => (
          <button
            type="button"
            key={a.name}
            className={'arch-thumb' + (i === idx ? ' active' : '')}
            onClick={() => setIdx(i)}
          >
            <div className="tbands">
              {a.palette.map((c, j) => (
                <span key={j} style={{ background: c }} />
              ))}
            </div>
            <div className="tname">{a.name}</div>
            <div className="tscore">Consistency {a.score}</div>
          </button>
        ))}
      </div>

      <p className="arch-note">
        Each panel pairs a licensed sample photograph with an extracted colour
        grade and its five-colour palette, graded to the house look. Real
        creator work replaces these frames as features clear.
      </p>
    </section>
  )
}
