'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { ARCHETYPES, DEMO_SAMPLES, unsplashSrc } from '@/lib/landing-archetypes'

/** Stage-tile indices that hold the four photographs; the rest stay grades. */
const PHOTO_SLOTS = [0, 2, 5, 7]

/** Count an element's text from 0 → `to` over `dur` ms. */
function countTo(el: HTMLElement, to: number, dur: number) {
  const t0 = performance.now()
  const step = (t: number) => {
    const p = Math.min(1, (t - t0) / dur)
    el.textContent = String(Math.round(p * to))
    if (p < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}

type Reading = { idx: number; run: number }

/**
 * Plate III — Try It. Pick one of three sample feeds (colour grades, no
 * photos), hit Analyze, and the reading assembles: a scan line sweeps, palette
 * bands wipe in staggered, the consistency score counts up, then the tone,
 * mood chips, signature and the Shoot next / Avoid brief fade in. Maps 1:1 onto
 * the real creative_brief schema. Reduced motion renders the reading at once.
 */
export function TryItDemo() {
  const [sel, setSel] = useState(0)
  const [busy, setBusy] = useState(false)
  const [touched, setTouched] = useState(false)
  const [reading, setReading] = useState<Reading | null>(null)
  const [btnLabel, setBtnLabel] = useState('Analyze this feed')
  const [status, setStatus] = useState('')

  const scanRef = useRef<HTMLDivElement>(null)
  const readingRef = useRef<HTMLDivElement>(null)
  const reduceMotion = useRef(false)

  useEffect(() => {
    reduceMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])

  function pick(i: number) {
    if (busy) return
    setSel(i)
    setTouched(true)
    setReading(null)
    setBtnLabel('Analyze this feed')
  }

  function analyze() {
    if (busy) return
    setBusy(true)
    const dnaIndex = DEMO_SAMPLES[sel].dnaIndex
    const rm = reduceMotion.current
    if (!rm && scanRef.current) {
      const s = scanRef.current
      s.classList.remove('run')
      void s.offsetWidth
      s.classList.add('run')
    }
    setStatus('READING AESTHETIC DNA…')
    window.setTimeout(
      () => {
        setStatus('')
        setReading((prev) => ({ idx: dnaIndex, run: (prev?.run ?? 0) + 1 }))
        setBusy(false)
        setBtnLabel('Analyze again')
      },
      rm ? 0 : 1500,
    )
  }

  // Assemble the reading each time one is generated: stagger the `.in` classes
  // and count the score up. Reduced motion jumps straight to the final state.
  useEffect(() => {
    if (!reading) return
    const root = readingRef.current
    if (!root) return
    const a = ARCHETYPES[reading.idx]
    const bands = Array.from(root.querySelectorAll<HTMLElement>('.rd-bands span'))
    const chips = Array.from(root.querySelectorAll<HTMLElement>('.rd-chips b'))
    const sig = root.querySelector<HTMLElement>('.rd-sig')
    const brief = root.querySelector<HTMLElement>('.rd-brief')
    const scoreEl = root.querySelector<HTMLElement>('.rd-score span')
    if (!sig || !brief || !scoreEl) return

    if (reduceMotion.current) {
      bands.forEach((b) => b.classList.add('in'))
      chips.forEach((c) => c.classList.add('in'))
      sig.classList.add('in')
      brief.classList.add('in')
      scoreEl.textContent = String(a.score)
      return
    }

    const timers: number[] = []
    bands.forEach((b, i) =>
      timers.push(window.setTimeout(() => b.classList.add('in'), i * 120)),
    )
    timers.push(
      window.setTimeout(
        () => {
          chips.forEach((c, i) =>
            timers.push(window.setTimeout(() => c.classList.add('in'), i * 110)),
          )
          sig.classList.add('in')
          countTo(scoreEl, a.score, 900)
        },
        bands.length * 120 + 120,
      ),
    )
    timers.push(
      window.setTimeout(() => brief.classList.add('in'), bands.length * 120 + 520),
    )
    return () => timers.forEach((t) => clearTimeout(t))
  }, [reading])

  const a = reading ? ARCHETYPES[reading.idx] : null

  return (
    <section id="demo" className="demo2-sec">
      <div className="plate-tag">
        <span className="no">Plate III</span>
        <span className="rule" />
        <span className="meta">Try It</span>
      </div>
      <div className="arch-head">
        <h2>Read a feed&apos;s DNA in real time.</h2>
        <div className="arch-hint">
          <i />
          <span className="meta">Live demo · pick a sample</span>
        </div>
      </div>

      <div className="demo2-wrap">
        <div className="feedpick">
          <div className="meta" style={{ marginBottom: '14px' }}>
            01 · Choose a sample feed
          </div>
          <div className="feed-samples">
            {DEMO_SAMPLES.map((s, i) => (
              <button
                type="button"
                key={s.label}
                className={'feed-sample' + (i === sel ? ' active' : '')}
                onClick={() => pick(i)}
              >
                <div className="tiles">
                  {s.photos
                    ? s.photos.slice(0, 4).map((id, j) => (
                        <span className="ph" key={j}>
                          <Image src={unsplashSrc(id)} alt="" fill sizes="70px" />
                        </span>
                      ))
                    : s.tiles.slice(0, 4).map((t, j) => (
                        <i key={j} style={{ background: t }} />
                      ))}
                </div>
                <span className="fs-lbl">{s.label}</span>
              </button>
            ))}
          </div>
          <div className="feed-stage">
            <div className="bigtiles">
              {DEMO_SAMPLES[sel].photos
                ? DEMO_SAMPLES[sel].tiles.map((t, i) => {
                    const slot = PHOTO_SLOTS.indexOf(i)
                    const id = slot >= 0 ? DEMO_SAMPLES[sel].photos![slot] : undefined
                    return id ? (
                      <span className="ph" key={i}>
                        <Image
                          src={unsplashSrc(id)}
                          alt=""
                          fill
                          sizes="(max-width: 900px) 24vw, 130px"
                        />
                      </span>
                    ) : (
                      <i key={i} style={{ background: t }} />
                    )
                  })
                : DEMO_SAMPLES[sel].tiles.map((t, i) => (
                    <i key={i} style={{ background: t }} />
                  ))}
            </div>
            <div className="scanline" ref={scanRef} />
          </div>
          <button
            type="button"
            className="analyze-btn"
            onClick={analyze}
            disabled={busy}
          >
            {btnLabel}
          </button>
          <div className="analyze-status meta">{status}</div>
        </div>

        <div className="reading glass-card" ref={readingRef}>
          {!a ? (
            <div className="reading-empty">
              <div className="meta">Aesthetic DNA</div>
              <p>
                {touched
                  ? 'Analyze the selected feed to generate its reading.'
                  : 'Pick a sample feed and analyze it. Aesthete returns the archetype, palette, tone, a consistency score, and a creative direction of what to shoot next and what to avoid.'}
              </p>
            </div>
          ) : (
            <div key={reading!.run}>
              <div className="rd-top">
                <div className="rd-name">{a.name}</div>
                <div className="rd-score">
                  <span>0</span>
                  <small>Consistency</small>
                </div>
              </div>
              <div className="rd-bands">
                {a.palette.map((c, i) => (
                  <span key={i} style={{ background: c }} />
                ))}
              </div>
              <div className="rd-row">
                <span className="rk">Tone</span>
                <span className="rv">{a.tone}</span>
              </div>
              <div className="rd-chips">
                {a.mood.map((m, i) => (
                  <b key={i}>{m}</b>
                ))}
              </div>
              <p className="rd-sig">{a.sig}</p>
              <div className="rd-brief">
                <div className="rd-col">
                  <div className="rd-h">Shoot next</div>
                  <ul>
                    {a.shoot.map((x, i) => (
                      <li key={i}>{x}</li>
                    ))}
                  </ul>
                </div>
                <div className="rd-col rd-col--avoid">
                  <div className="rd-h">Avoid</div>
                  <ul>
                    {a.avoid.map((x, i) => (
                      <li key={i}>{x}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <p className="arch-note">
        Sample feeds mix real photographs with colour grades. The reading runs
        the same schema your uploads do.
      </p>
      {DEMO_SAMPLES[sel].credits && (
        <p className="demo-credit">
          Photography · {DEMO_SAMPLES[sel].credits!.join(', ')}
        </p>
      )}
    </section>
  )
}
