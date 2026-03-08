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
  const ref = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const el = ref.current;

    if (!el) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (delay > 0) {
            timerRef.current = setTimeout(() => setIsVisible(true), delay);
          } else {
            setIsVisible(true);
          }
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -30px 0px' },
    );

    observer.observe(el);
    return () => {
      observer.disconnect();

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [delay]);

  return (
    <div
      ref={ref}
      className={`animate-on-scroll ${isVisible ? 'animate-on-scroll-visible' : ''} ${className}`}
    >
      {children}
    </div>
  );
}
