'use client'

import { useEffect } from 'react'

/**
 * Adds the `.visible` class to editorial reveal targets as they scroll into
 * view, mirroring the IntersectionObserver in the landing design spec.
 * Rendered once per page; it observes elements already in the DOM.
 */
export function ScrollReveal() {
  useEffect(() => {
    const targets = document.querySelectorAll(
      '.feature-entry, .proc-step, .cta-final'
    )

    if (!('IntersectionObserver' in window)) {
      targets.forEach((el) => el.classList.add('visible'))
      return
    }

    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('visible')
            io.unobserve(e.target)
          }
        }),
      { threshold: 0.1 }
    )

    targets.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  return null
}
