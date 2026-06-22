import Link from 'next/link'
import { EditorialNav } from '@/components/editorial/EditorialNav'
import { EditorialFooter } from '@/components/editorial/EditorialFooter'
import { ScrollReveal } from '@/components/editorial/ScrollReveal'

/* ─── The source strand — Specimen № 001 ──────────────────────────── */
const BANDS: { c: string; h: number }[] = [
  { c: '#C4834A', h: 74 }, { c: '#D4A870', h: 58 }, { c: '#B8926A', h: 86 },
  { c: '#2C4E7A', h: 62 },
  { c: '#7A9870', h: 90 }, { c: '#5A7A58', h: 56 },
  { c: '#E8D4B4', h: 78 }, { c: '#D4BF98', h: 66 }, { c: '#C8AA80', h: 88 },
  { c: '#1E3A5F', h: 72 }, { c: '#3D6699', h: 55 },
  { c: '#C4886A', h: 80 }, { c: '#B07060', h: 65 }, { c: '#D4A898', h: 92 },
  { c: '#C4933A', h: 70 }, { c: '#A87828', h: 58 },
  { c: '#2C4E7A', h: 64 },
  { c: '#9A8EA8', h: 62 }, { c: '#D8C4B0', h: 82 }, { c: '#E0CEBC', h: 90 },
  { c: '#5A7A58', h: 60 }, { c: '#8A9898', h: 74 }, { c: '#C8A080', h: 56 },
  { c: '#1E3A5F', h: 78 },
  { c: '#D4934E', h: 68 }, { c: '#B8AEC8', h: 88 }, { c: '#C49038', h: 64 },
  { c: '#C4834A', h: 72 }, { c: '#8A9898', h: 60 }, { c: '#E8D4B4', h: 84 },
]

/* Dark-room constellation — DNA colours as faint points of light */
const POINTS: { c: string; x: number; y: number }[] = [
  { c: '#C4933A', x: 14, y: 28 }, { c: '#7A9870', x: 82, y: 22 },
  { c: '#C4886A', x: 24, y: 72 }, { c: '#B8AEC8', x: 90, y: 64 },
  { c: '#D4934E', x: 68, y: 18 }, { c: '#5A7A58', x: 8, y: 58 },
  { c: '#8A9898', x: 50, y: 84 }, { c: '#C4834A', x: 38, y: 14 },
  { c: '#3D6699', x: 76, y: 80 }, { c: '#E8D4B4', x: 60, y: 50 },
]

/* Resolution strand — full palette combined, the coda */
const RESOLUTION: string[] = [
  '#C4933A', '#D4934E', '#C4834A', '#9B6A38', '#7A9870', '#5A7A58',
  '#C4886A', '#D4A898', '#8A9898', '#B8AEC8', '#E8D4B4', '#1E3A5F',
  '#2C4E7A', '#3D6699', '#C49038', '#B8926A', '#D8C4B0', '#C8A080',
  '#9A8EA8', '#E0CEBC', '#C4886A', '#7A9870', '#C4933A', '#1E3A5F',
]

export default function Home() {
  return (
    <div className="editorial">
      <EditorialNav />

      {/* ═══ MOVEMENT 1 — HERO. Two colours only. ═══ */}
      <section className="hero">
        <div className="hero-painting" data-l="A" aria-hidden="true">
          A
        </div>
        <div className="hero-grain" aria-hidden="true" />
        <div className="hero-content">
          <div className="exhibition-label">
            <span className="tick" />
            <span>Visual identity, codified</span>
          </div>
          <div className="hero-statement">
            <h1>
              Your feed
              <br />
              <span className="ind">
                <span className="it">has a</span> signature.
              </span>
            </h1>
          </div>
        </div>
        <div className="hero-footer">
          <p>
            <strong style={{ color: 'var(--ink)', fontWeight: 500 }}>
              Aesthete extracts the visual identity hidden in your content
            </strong>{' '}
            — palette, tone, mood, composition — then applies it automatically
            to every photo and video you publish. A creative director that
            already knows your taste.
          </p>
          <div className="hero-footer-right">
            <Link className="btn-prussian" href="/signup">
              Analyse my feed →
            </Link>
            <span className="note">
              Free Aesthetic DNA report — no credit card required
            </span>
          </div>
        </div>
      </section>

      {/* ═══ MOVEMENT 2 — THE SOURCE. Full chromatic strand. ═══ */}
      <div className="dna-installation">
        <div className="installation-meta">
          <span className="install-label">
            Specimen № 001 — Colour identity strand
          </span>
          <p className="install-caption">
            A real Aesthetic DNA strand, extracted from one creator&apos;s feed.
            Each band is a dominant colour sampled across their body of work —
            warm tones the creator brought, cool threads the system found.
          </p>
        </div>
        <div className="dna-object">
          {BANDS.map(({ c, h }, i) => (
            <span
              key={i}
              style={{
                background: c,
                height: `${h}%`,
                animation: `dnaRise .7s cubic-bezier(0.16,1,0.3,1) ${(
                  0.15 +
                  i * 0.028
                ).toFixed(3)}s both, shimmer ${(3 + (i % 5) * 0.45).toFixed(
                  2
                )}s ease-in-out ${(i * 0.11).toFixed(2)}s infinite`,
              }}
            />
          ))}
          <div className="dna-base" />
        </div>
        <div className="installation-title">
          <h2>Warm Editorial Minimalism</h2>
          <p>Extracted — 11 June 2025 — 12 images analysed</p>
        </div>
      </div>

      {/* PRODUCT DEMONSTRATION — before → DNA → after */}
      <section className="demo-section">
        <div className="demo-head">
          <p className="section-label">What actually happens</p>
          <h2>
            Raw content in. <em>On-brand content</em> out.
          </h2>
        </div>
        <div className="demo-flow">
          {/* Stage 1 — raw feed */}
          <div className="demo-stage">
            <p className="demo-stage-label">
              <span className="n">01</span> Your raw feed
            </p>
            <div className="demo-grid" aria-hidden="true">
              <div className="tile" style={{ background: '#7d94a8' }} />
              <div className="tile" style={{ background: '#c9b48f' }} />
              <div className="tile" style={{ background: '#9aa17c' }} />
              <div className="tile" style={{ background: '#b58b6a' }} />
              <div className="tile" style={{ background: '#6f7d86' }} />
              <div className="tile" style={{ background: '#d8c9b0' }} />
            </div>
          </div>

          <div className="demo-arrow" aria-hidden="true">
            →
          </div>

          {/* Stage 2 — DNA report */}
          <div className="demo-stage">
            <p className="demo-stage-label">
              <span className="n">02</span> Aesthetic DNA
            </p>
            <div className="demo-report" aria-hidden="true">
              <p className="r-kicker">Aesthetic DNA</p>
              <p className="r-title">Warm Editorial Minimalism</p>
              <div className="r-swatches">
                <i style={{ background: '#c8a88a' }} />
                <i style={{ background: '#e8ddd2' }} />
                <i style={{ background: '#5c6b5e' }} />
                <i style={{ background: '#9a8f82' }} />
              </div>
              <div className="r-row">
                <span className="k">Temperature</span>
                <span className="v">Warm</span>
              </div>
              <div className="r-row">
                <span className="k">Exposure</span>
                <span className="v">Bright, airy</span>
              </div>
              <div className="r-row">
                <span className="k">Mood</span>
                <span className="v">Considered</span>
              </div>
              <div className="r-score">
                <span className="num">91</span>
                <span className="den">/ 100 continuity</span>
              </div>
            </div>
          </div>

          <div className="demo-arrow" aria-hidden="true">
            →
          </div>

          {/* Stage 3 — consistent output */}
          <div className="demo-stage">
            <p className="demo-stage-label">
              <span className="n">03</span> Graded to your DNA
            </p>
            <div className="demo-grid" aria-hidden="true">
              <div className="tile" style={{ background: '#c8a88a' }} />
              <div className="tile" style={{ background: '#d9c5b2' }} />
              <div className="tile" style={{ background: '#9a8f82' }} />
              <div className="tile" style={{ background: '#c4886a' }} />
              <div className="tile" style={{ background: '#5c6b5e' }} />
              <div className="tile" style={{ background: '#e8ddd2' }} />
            </div>
          </div>
        </div>
      </section>

      {/* ═══ MOVEMENT 4 — PROCESS. How it works, early. ═══ */}
      <section className="process-section" id="process">
        <div className="process-head">
          <h2>
            From feed to
            <br />
            <em>fingerprint</em>
            <br />
            in four steps.
          </h2>
          <p>
            No briefs. No presets. No design literacy required. Aesthete learns
            your identity once, then protects it on every post that follows.
          </p>
        </div>
        <div className="process-steps">
          <div className="proc-step" style={{ '--leak': 'var(--dna-amber)' } as React.CSSProperties}>
            <span className="proc-step-num">one</span>
            <h4>Connect your feed</h4>
            <p>
              Upload 6–12 posts. Aesthete reads the set as a whole — the
              identity that connects them, not each image alone.
            </p>
          </div>
          <div className="proc-step" style={{ '--leak': 'var(--dna-sage)' } as React.CSSProperties}>
            <span className="proc-step-num">two</span>
            <h4>Approve your DNA</h4>
            <p>
              Review your Aesthetic DNA profile. Nothing is processed until you
              confirm it accurately represents your vision.
            </p>
          </div>
          <div className="proc-step" style={{ '--leak': 'var(--dna-rose)' } as React.CSSProperties}>
            <span className="proc-step-num">three</span>
            <h4>Upload raw content</h4>
            <p>
              Drop in unedited photos and footage. Everything returns graded to
              your locked identity automatically.
            </p>
          </div>
          <div className="proc-step" style={{ '--leak': 'var(--prussian-mid)' } as React.CSSProperties}>
            <span className="proc-step-num">four</span>
            <h4>Stay consistent</h4>
            <p>
              Weekly continuity scores and pre-publish checks keep your identity
              intact — post after post, month after month.
            </p>
          </div>
        </div>
      </section>

      {/* ═══ MOVEMENT 3 — THE LEAK. Capabilities in depth. ═══ */}
      <section className="feature-gallery" id="work">
        <div className="feature-entry" style={{ '--leak': 'var(--dna-amber)' } as React.CSSProperties}>
          <div className="feat-num">01</div>
          <div className="feat-body">
            <p className="feat-tag">Identity</p>
            <h3>Aesthetic DNA fingerprinting</h3>
            <p>
              Connect your feed and Aesthete extracts the identity embedded in
              it — palette, tone, composition, mood — into a precise, codified
              profile you approve before anything is touched.
            </p>
            <div className="feat-specs">
              <span>12-image analysis</span>
              <span>palette extraction</span>
              <span>composition mapping</span>
              <span>mood detection</span>
            </div>
          </div>
          <div className="feat-aside">
            <div className="feat-aside-rule" />
            <p>
              Most creators describe seeing their DNA report as the first time
              they truly understood what their feed was saying about them.
            </p>
          </div>
        </div>

        <div className="feature-entry" style={{ '--leak': 'var(--dna-sage)' } as React.CSSProperties}>
          <div className="feat-num">02</div>
          <div className="feat-body">
            <p className="feat-tag">Continuity</p>
            <h3>Style-locked content output</h3>
            <p>
              Upload raw photos and footage. Everything returns graded to your
              DNA — colour, tone, and mood matched to your feed automatically.
              What once required an editor takes minutes.
            </p>
            <div className="feat-specs">
              <span>photo &amp; video</span>
              <span>automatic colour grade</span>
              <span>tone matching</span>
              <span>all export formats</span>
            </div>
          </div>
          <div className="feat-aside">
            <div className="feat-aside-rule" />
            <p>
              Works with JPEG, PNG, and video. Output exports in all standard
              formats, ready to publish directly from the studio.
            </p>
          </div>
        </div>

        <div className="feature-entry" style={{ '--leak': 'var(--dna-rose)' } as React.CSSProperties}>
          <div className="feat-num">03</div>
          <div className="feat-body">
            <p className="feat-tag">Vigilance</p>
            <h3>Pre-publish deviation checks</h3>
            <p>
              Every post is scored against your DNA before it reaches your
              audience. Deviation alerts surface when something would break your
              visual identity — at the moment it can still be fixed.
            </p>
            <div className="feat-specs">
              <span>0–100 continuity score</span>
              <span>pre-publish alerts</span>
              <span>per-post breakdown</span>
            </div>
          </div>
          <div className="feat-aside">
            <div className="feat-aside-rule" />
            <p>
              The continuity score is numerical — you see 91, not a vague
              approval. Precision matters when identity is the product.
            </p>
          </div>
        </div>

        <div className="feature-entry" style={{ '--leak': 'var(--dna-lilac)' } as React.CSSProperties}>
          <div className="feat-num">04</div>
          <div className="feat-body">
            <p className="feat-tag">Evolution</p>
            <h3>Identity that grows with you</h3>
            <p>
              Every 90 days, Aesthete surfaces how your aesthetic has shifted
              and where it&apos;s heading. Your profile evolves with you rather
              than holding you still.
            </p>
            <div className="feat-specs">
              <span>90-day reviews</span>
              <span>drift tracking</span>
              <span>evolution reports</span>
            </div>
          </div>
          <div className="feat-aside">
            <div className="feat-aside-rule" />
            <p>
              Style evolution reports document the arc of your visual identity
              over time — a record no other tool keeps.
            </p>
          </div>
        </div>
      </section>

      {/* Social proof slot */}
      <div className="proof-strip" id="pricing">
        <p className="label">From the studio</p>
        <p className="quote">
          &ldquo;The first time I saw my Aesthetic DNA, I finally understood what
          my feed had been trying to say for three years.&rdquo;
        </p>
        <p className="attr">— Early access creator · lifestyle &amp; wellness</p>
      </div>

      {/* ═══ PHILOSOPHY — the studio. ═══ */}
      <section className="dark-room">
        <div className="dark-room-ghost" aria-hidden="true">
          Studio
        </div>
        <div className="dark-room-constellation" aria-hidden="true">
          {POINTS.map(({ c, x, y }, i) => (
            <span
              key={i}
              style={{
                background: c,
                left: `${x}%`,
                top: `${y}%`,
                boxShadow: `0 0 12px 2px ${c}66`,
              }}
            />
          ))}
        </div>
        <div className="dark-room-content">
          <p className="dark-room-label">The studio</p>
          <p className="dark-room-quote">
            &ldquo;The editing is just the first expression of the system. The
            real product is the identity that lives inside it.&rdquo;
          </p>
          <p className="dark-room-attr">
            Aesthete — on why this is not an editing tool
          </p>
        </div>
      </section>

      {/* ═══ MOVEMENT 5 — RESOLUTION. All colours combine. ═══ */}
      <section className="cta-final" id="cta">
        <div className="cta-wash" aria-hidden="true" />
        <div className="cta-inner">
          <div>
            <div className="resolution-strand" aria-hidden="true">
              {RESOLUTION.map((c, i) => (
                <span
                  key={i}
                  style={{
                    background: c,
                    height: `${55 + ((i * 13) % 45)}%`,
                    animationDelay: `${(i * 0.04).toFixed(2)}s`,
                  }}
                />
              ))}
            </div>
            <h2>
              See your
              <br />
              <em>visual identity</em>
              <br />
              clearly.
            </h2>
          </div>
          <div className="cta-body">
            <p>
              The Aesthetic DNA report is free, takes two minutes, and is yours
              to keep — whether you subscribe or not. Most people describe it as
              the first time they truly understood what their feed was
              communicating.
            </p>
            <div>
              <Link className="btn-prussian" href="/signup">
                Get your DNA report →
              </Link>
            </div>
            <span className="note">
              Upload 6–12 images · receive your report in ~2 minutes · no account
              needed
            </span>
          </div>
        </div>
      </section>

      <EditorialFooter />
      <ScrollReveal />
    </div>
  )
}
