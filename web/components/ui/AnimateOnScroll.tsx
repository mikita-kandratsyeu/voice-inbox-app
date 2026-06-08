'use client';

import { useEffect, useRef, useState } from 'react';

type Props = {
  children: React.ReactNode;
  className?: string;
  delay?: number;
};

export function AnimateOnScroll({
  children,
  className = '',
  delay = 0,
}: Props): React.ReactElement {
  const [isVisible, setIsVisible] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const el = ref.current;

    if (!el) {
      return;
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setIsVisible(true);
      setIsDone(true);
      return;
    }

    const reveal = (): void => {
      setIsVisible(true);
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
  }, [delay]);

  const handleTransitionEnd = (event: React.TransitionEvent<HTMLDivElement>): void => {
    if (event.propertyName === 'transform') {
      setIsDone(true);
    }
  };

  return (
    <div
      ref={ref}
      onTransitionEnd={handleTransitionEnd}
      className={`animate-on-scroll ${isVisible ? 'animate-on-scroll-visible' : ''} ${isDone ? 'animate-on-scroll-done' : ''} ${className}`}
    >
      {children}
    </div>
  );
}
