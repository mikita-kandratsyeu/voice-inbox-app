'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

type Props = {
  children: React.ReactNode;
  className?: string;
  delay?: number;
};

function subscribeReducedMotion(onStoreChange: () => void): () => void {
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  media.addEventListener('change', onStoreChange);
  return () => media.removeEventListener('change', onStoreChange);
}

function getReducedMotionSnapshot(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function getReducedMotionServerSnapshot(): boolean {
  return false;
}

export function AnimateOnScroll({
  children,
  className = '',
  delay = 0,
}: Props): React.ReactElement {
  const prefersReducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot,
  );
  const [hasRevealed, setHasRevealed] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isVisible = prefersReducedMotion || hasRevealed;
  const animationDone = prefersReducedMotion || isDone;

  useEffect(() => {
    if (prefersReducedMotion) {
      return;
    }

    const el = ref.current;
    if (!el) {
      return;
    }

    const reveal = (): void => {
      setHasRevealed(true);
      observer.unobserve(el);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          return;
        }

        if (delay > 0) {
          timerRef.current = setTimeout(reveal, delay);
        } else {
          reveal();
        }
      },
      { threshold: 0.08, rootMargin: '0px 0px -48px 0px' },
    );

    observer.observe(el);
    return () => {
      observer.disconnect();

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [delay, prefersReducedMotion]);

  const handleTransitionEnd = (event: React.TransitionEvent<HTMLDivElement>): void => {
    if (event.propertyName === 'transform') {
      setIsDone(true);
    }
  };

  return (
    <div
      ref={ref}
      onTransitionEnd={prefersReducedMotion ? undefined : handleTransitionEnd}
      className={`animate-on-scroll ${isVisible ? 'animate-on-scroll-visible' : ''} ${animationDone ? 'animate-on-scroll-done' : ''} ${className}`}
    >
      {children}
    </div>
  );
}
