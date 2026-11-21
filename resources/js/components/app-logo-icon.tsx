import type { SVGAttributes } from 'react';

/**
 * Taptale mark: a keepsake tag with a "tap" ripple.
 */
export default function AppLogoIcon(props: SVGAttributes<SVGElement>) {
    return (
        <svg
            {...props}
            viewBox="0 0 40 40"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
        >
            <path
                d="M14 8.5a4 4 0 0 1 8 0"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
            />
            <path
                d="M9 15.5c0-2.5 2-4.5 4.5-4.5h9c2.5 0 4.5 2 4.5 4.5v13.2c0 1.2-.5 2.4-1.4 3.2l-6.5 5.6a2 2 0 0 1-2.6 0l-6.5-5.6A4.3 4.3 0 0 1 9 28.7V15.5Z"
                fill="currentColor"
            />
            <path
                d="M18 26.2s-4.2-2.5-4.2-5.3a2.3 2.3 0 0 1 4.2-1.3 2.3 2.3 0 0 1 4.2 1.3c0 2.8-4.2 5.3-4.2 5.3Z"
                fill="var(--logo-heart, #fff)"
            />
            <path
                d="M30.5 13.5a7 7 0 0 1 0 9M33.8 10.5a11.5 11.5 0 0 1 0 15"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                opacity="0.55"
            />
        </svg>
    );
}
