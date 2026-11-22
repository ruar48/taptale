import { createInertiaApp } from '@inertiajs/react';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { initializeTheme } from '@/hooks/use-appearance';
import AppLayout from '@/layouts/app-layout';
import AuthLayout from '@/layouts/auth-layout';
import SettingsLayout from '@/layouts/settings/layout';
import StorefrontLayout from '@/layouts/storefront-layout';

/**
 * The brand is fixed so tabs never show the framework default ("Laravel")
 * when APP_NAME is not set on the server.
 */
const brand = 'Taptale';

void createInertiaApp({
    title: (title) => (title ? `${brand} | ${title}` : brand),
    layout: (name) => {
        switch (true) {
            case name === 'storefront/experience':
                return null;
            case name.startsWith('storefront/'):
                return StorefrontLayout;
            case name.startsWith('auth/'):
                return AuthLayout;
            case name.startsWith('settings/'):
                return [AppLayout, SettingsLayout];
            default:
                return AppLayout;
        }
    },
    strictMode: true,
    withApp(app) {
        return (
            <TooltipProvider delayDuration={0}>
                {app}
                <Toaster />
            </TooltipProvider>
        );
    },
    progress: {
        color: '#B86F83',
    },
});

// This will set light / dark mode on load...
initializeTheme();
