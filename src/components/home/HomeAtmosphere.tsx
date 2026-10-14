'use client';

import { useEffect, useRef, type ReactNode } from 'react';

/** Motion is an enhancement: server-rendered content is always visible. */
export function HomeAtmosphere({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!root.current || !('IntersectionObserver' in window)) return;

    const animations = new Set<Animation>();
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        if (media.matches || !('animate' in entry.target)) continue;
        const siblings = Array.from(entry.target.parentElement?.children ?? []);
        const delay = Math.min(siblings.indexOf(entry.target), 3) * 65;
        const animation = entry.target.animate(
          [{ opacity: 0.65, translate: '0 14px' }, { opacity: 1, translate: '0 0' }],
          { duration: 560, delay, easing: 'cubic-bezier(.22, 1, .36, 1)' },
        );
        animations.add(animation);
        animation.onfinish = () => animations.delete(animation);
      }
    }, { threshold: 0.08 });

    root.current.querySelectorAll('[data-home-reveal]').forEach((element) => observer.observe(element));
    const cancelMotion = () => {
      if (media.matches) animations.forEach((animation) => animation.cancel());
    };
    media.addEventListener('change', cancelMotion);
    return () => {
      observer.disconnect();
      animations.forEach((animation) => animation.cancel());
      media.removeEventListener('change', cancelMotion);
    };
  }, []);

  return <div ref={root} className="home-page space-y-10 sm:space-y-14 pb-12 overflow-hidden">{children}</div>;
}
