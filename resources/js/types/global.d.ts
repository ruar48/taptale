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
                deliveryFee: number;
                freeDeliveryThreshold: number;
                business: {
                    name: string;
                    email: string | null;
                    phone: string | null;
                    address: string | null;
                    facebook_url: string | null;
                    instagram_url: string | null;
                };
                policiesUpdatedOn: string;
            };
            navCategories: CategorySummary[];
            [key: string]: unknown;
        };
    }
}
