<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" @class(['dark' => ($appearance ?? 'light') == 'dark'])>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        {{-- "only" stops phone browsers (Chrome auto-dark, Samsung Internet) from force-darkening our colours --}}
        <meta name="color-scheme" content="{{ ($appearance ?? 'light') == 'dark' ? 'only dark' : 'only light' }}">

        {{-- Inline script to detect system dark mode preference and apply it immediately --}}
        <script>
            (function() {
                const appearance = '{{ $appearance ?? "light" }}';

                if (appearance === 'system') {
                    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

                    if (prefersDark) {
                        document.documentElement.classList.add('dark');
                        document.querySelector('meta[name="color-scheme"]').setAttribute('content', 'only dark');
                    }
                }
            })();
        </script>

        {{-- Inline style to set the HTML background color based on our theme in app.css --}}
        <style>
            html {
                background-color: #fbf8f4;
            }

            html.dark {
                background-color: #1b191e;
            }
        </style>

        <link rel="icon" href="/favicon.ico?v=2" sizes="48x48">
        <link rel="icon" href="/favicon-96x96.png?v=2" type="image/png" sizes="96x96">
        <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=2">
        <meta name="theme-color" content="#713D50">

        @if ($page['component'] === 'storefront/home')
            {{-- Start the hero (the LCP image) download before the JavaScript runs; keep in sync with home.tsx --}}
            <link rel="preload" as="image" fetchpriority="high" type="image/webp"
                imagesrcset="/image/taptale-nfc-wedding-couple-hero-640.webp 640w, /image/taptale-nfc-wedding-couple-hero-960.webp 960w, /image/taptale-nfc-wedding-couple-hero-1280.webp 1280w, /image/taptale-nfc-wedding-couple-hero.webp 1672w"
                imagesizes="(min-width: 1024px) 100vw, calc(100vw - 2rem)">
        @endif

        @fonts

        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/app.tsx', "resources/js/pages/{$page['component']}.tsx"])
        <x-inertia::head>
            @include('partials.seo')
        </x-inertia::head>
    </head>
    <body class="font-sans antialiased">
        <x-inertia::app />
    </body>
</html>
