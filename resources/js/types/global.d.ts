import type { Auth } from '@/types/auth';
import type { CategorySummary } from '@/types/taptale';

declare module 'react' {
    interface InputHTMLAttributes<T> {
        passwordrules?: string;
    }
}

declare module '@inertiajs/core' {
    export interface InertiaConfig {
        sharedPageProps: {
            name: string;
            auth: Auth;
            sidebarOpen: boolean;
            storefront: {
                currencySymbol: string;
                tagline: string;
            };
            navCategories: CategorySummary[];
            [key: string]: unknown;
        };
    }
}
