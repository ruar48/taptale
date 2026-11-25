import { useEffect, useState } from 'react';
import type { RefObject } from 'react';

/**
 * Flips to true the first time the element scrolls into view and stays true,
 * so entrance animations play once. Browsers without IntersectionObserver
 * are treated as already in view.
 */
export function useInView(
    ref: RefObject<HTMLElement | null>,
    threshold = 0.2,
): boolean {
    const [inView, setInView] = useState(false);

    useEffect(() => {
        const element = ref.current;

        if (!element || typeof IntersectionObserver === 'undefined') {
            setInView(true);

            return;
        }

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setInView(true);
                    observer.disconnect();
                }
            },
            { threshold },
        );

        observer.observe(element);

        return () => observer.disconnect();
    }, [ref, threshold]);

    return inView;
}
