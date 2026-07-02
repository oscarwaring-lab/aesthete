import { EditorialNav } from '@/components/editorial/EditorialNav'
import { Hero } from '@/components/landing/Hero'
import { StrandSection } from '@/components/landing/StrandSection'
import { ReportSection } from '@/components/landing/ReportSection'
import { TryItDemo } from '@/components/landing/TryItDemo'
import { ArchetypeGallery } from '@/components/landing/ArchetypeGallery'
import { MethodSection } from '@/components/landing/MethodSection'
import { FeaturesSection } from '@/components/landing/FeaturesSection'
import { DarkroomSection } from '@/components/landing/DarkroomSection'
import { CtaSection } from '@/components/landing/CtaSection'
import { Footer } from '@/components/landing/Footer'
import { FancyLayer } from '@/components/landing/FancyLayer'

/**
 * Public landing — Liquid Glass × Editorial × Gallery, matching
 * design/landing-prototype.html. The shell is a Server Component; interactivity
 * (try-it demo, archetype gallery, and the fancy scroll/tilt/intro layer) lives
 * in small client leaves. Root carries both `editorial` (shared nav/footer +
 * tokens) and `landing` (this page's ported styles).
 */
export default function Home() {
  return (
    <div className="editorial landing">
      <EditorialNav />
      <Hero />
      <StrandSection />
      <ReportSection />
      <TryItDemo />
      <ArchetypeGallery />
      <MethodSection />
      <FeaturesSection />
      <DarkroomSection />
      <CtaSection />
      <Footer />
      <FancyLayer />
    </div>
  )
}
