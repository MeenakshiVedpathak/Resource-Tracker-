import { useEffect, useRef, useState } from 'react';
import { cn } from '@/utils/cn';

const PX_PER_SECOND = 45;
const MIN_DURATION = 0.5;
const RESET_DURATION = 0.2;

// Renders text clipped to its container; while `hovered` is true and the text
// overflows, slides it left just far enough to reveal the clipped tail, then
// snaps back once hover ends. No-ops (no motion) when the text already fits.
const ScrollOnHoverText = ({ text, hovered, className }) => {
  const containerRef = useRef(null);
  const innerRef = useRef(null);
  const [transform, setTransform] = useState('translateX(0)');
  const [duration, setDuration] = useState(RESET_DURATION);

  useEffect(() => {
    const container = containerRef.current;
    const inner = innerRef.current;
    if (!container || !inner) return;

    const overflow = hovered ? inner.scrollWidth - container.clientWidth : 0;
    if (overflow > 0) {
      setTransform(`translateX(-${overflow}px)`);
      setDuration(Math.max(overflow / PX_PER_SECOND, MIN_DURATION));
    } else {
      setTransform('translateX(0)');
      setDuration(RESET_DURATION);
    }
  }, [hovered, text]);

  return (
    <span ref={containerRef} className={cn('block w-full min-w-0 overflow-hidden whitespace-nowrap', className)}>
      <span
        ref={innerRef}
        className="inline-block whitespace-nowrap will-change-transform"
        style={{ transform, transition: `transform ${duration}s linear` }}
      >
        {text}
      </span>
    </span>
  );
};

export default ScrollOnHoverText;
