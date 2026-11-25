{{--
    Static first paint of the homepage (header bar + hero) so phones see the page as soon
    as the HTML arrives instead of after the JavaScript has downloaded and run. React
    replaces it on mount, so it must match <StorefrontLayout> and <Hero> in
    resources/js/pages/storefront/home.tsx — keep the markup and copy in sync.
--}}
@php
    $heroIcon = fn (string $paths, string $class): string => '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="'.$class.'">'.$paths.'</svg>';
    $heart = '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path>';
    $arrowRight = '<path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path>';
    $shieldCheck = '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"></path><path d="m9 12 2 2 4-4"></path>';
    $truck = '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"></path><path d="M15 18H9"></path><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"></path><circle cx="17" cy="18" r="2"></circle><circle cx="7" cy="18" r="2"></circle>';
    $perkIcon = 'size-4.5 shrink-0 text-plum dark:text-rose';
    $business = config('taptale.business');
    $inlineLink = 'font-medium text-plum underline decoration-plum/30 underline-offset-4 hover:decoration-plum dark:text-blush';
    $buttonBase ='inline-flex h-13 items-center justify-center gap-2 rounded-full px-7 text-base font-medium whitespace-nowrap has-[>svg]:px-4 [&_svg]:shrink-0';
@endphp
<div class="flex min-h-screen flex-col bg-cream text-charcoal dark:bg-background dark:text-foreground">
    <header class="sticky top-0 z-40 border-b border-plum/10 bg-cream/85 backdrop-blur-xl dark:border-border dark:bg-background/85">
        <div class="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6 lg:h-20 lg:px-8"></div>
    </header>
    <main class="flex-1">
        <section class="relative flex flex-col overflow-hidden bg-blush-light/40 lg:min-h-[640px] lg:justify-center dark:bg-background">
            <img
                src="/image/taptale-nfc-wedding-couple-hero-1280.webp"
                srcset="/image/taptale-nfc-wedding-couple-hero-640.webp 640w, /image/taptale-nfc-wedding-couple-hero-960.webp 960w, /image/taptale-nfc-wedding-couple-hero-1280.webp 1280w, /image/taptale-nfc-wedding-couple-hero.webp 1672w"
                sizes="(min-width: 1024px) 100vw, calc(100vw - 2rem)"
                alt="Personalized NFC photo keychain with a wedding couple photo beside a pink gift box and a tap-to-relive card"
                width="1672"
                height="941"
                fetchpriority="high"
                class="order-last mx-4 mb-12 aspect-[16/10] w-[calc(100%-2rem)] rounded-3xl object-cover object-[70%_center] shadow-[0_24px_50px_-24px_rgb(113_61_80/0.45)] sm:mx-6 sm:w-[calc(100%-3rem)] lg:absolute lg:inset-0 lg:order-none lg:m-0 lg:aspect-auto lg:h-full lg:w-full lg:rounded-none lg:object-[75%_center] lg:shadow-none"
            >
            <div class="pointer-events-none absolute inset-0 hidden bg-gradient-to-r from-[#fbe9e6]/95 via-[#fbe9e6]/60 to-transparent lg:block lg:w-[65%] dark:from-background dark:via-background/80"></div>

            <div class="relative mx-auto w-full max-w-7xl px-4 pt-12 pb-10 sm:px-6 lg:px-8 lg:py-24">
                <div class="max-w-xl">
                    <span class="inline-flex items-center gap-2 rounded-full border border-rose/30 bg-white/70 px-4 py-1.5 text-xs font-semibold tracking-wide text-plum backdrop-blur dark:bg-card/60 dark:text-blush">
                        {!! $heroIcon($heart, 'size-3.5 shrink-0') !!} A little gift. A lifetime of memories.
                    </span>
                    <h1 class="mt-6 font-display text-5xl leading-[1.05] font-medium text-balance text-charcoal sm:text-6xl lg:text-7xl dark:text-cream">
                        <span class="mb-4 block font-sans text-sm leading-normal font-semibold tracking-[0.2em] text-rose uppercase">Personalized NFC keychains in {{ $business['town'] }}</span>
                        Every memory deserves to be <em class="font-normal text-plum dark:text-rose">held.</em>
                    </h1>
                    <p class="mt-6 max-w-md text-lg leading-relaxed text-charcoal/75 dark:text-foreground/75">
                        Turn your favorite photos, videos and messages into personalized keepsakes that tell your story — with a single tap.
                    </p>
                    <div class="mt-8 flex flex-col gap-3 sm:flex-row">
                        <a href="{{ route('orders.create') }}" class="{{ $buttonBase }} bg-plum text-white shadow-[0_14px_30px_-12px_rgb(113_61_80/0.7)] dark:bg-blush dark:text-plum-dark">
                            Create your keepsake {!! $heroIcon($arrowRight, 'size-4') !!}
                        </a>
                        <a href="{{ route('categories.index') }}" class="{{ $buttonBase }} border border-plum/30 bg-white/60 text-plum shadow-xs backdrop-blur dark:bg-transparent dark:text-blush">
                            Explore gifts
                        </a>
                    </div>
                    <ul class="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm text-charcoal/75 dark:text-foreground/70">
                        <li class="flex items-center gap-2">{!! $heroIcon($shieldCheck, $perkIcon) !!} Premium quality</li>
                        <li class="flex items-center gap-2">{!! $heroIcon($truck, $perkIcon) !!} Delivery in {{ $business['town'] }} &amp; nearby</li>
                        <li class="flex items-center gap-2">{!! $heroIcon($heart, $perkIcon) !!} A gift with meaning</li>
                    </ul>
                </div>
            </div>
        </section>

        {{-- <LocalStudio> in home.tsx --}}
        <section class="border-b border-plum/10 py-16 dark:border-border">
            <div class="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[1.4fr_1fr] lg:px-8">
                <div>
                    <p class="mb-3 text-xs font-semibold tracking-[0.25em] text-rose uppercase">
                        Made in {{ $business['town'] }}, {{ $business['province'] }}
                    </p>
                    <h2 class="font-display text-3xl leading-tight font-medium text-balance sm:text-4xl">
                        Personalized NFC keychains and photo gifts, made right here in {{ $business['town'] }}
                    </h2>
                    <p class="mt-5 leading-relaxed text-charcoal/75 dark:text-foreground/75">
                        Taptale is a small gift studio in {{ $business['town'] }}, {{ $business['province'] }}. We design and make every NFC keychain and photo keepsake by hand, then deliver it to you or to the person you are surprising. Every keychain comes with its own memory page: your photos, a video, a song and a message that open with one tap on any phone, no app needed. Because every memory deserves to be held, not just scrolled past.
                    </p>
                    <p class="mt-4 leading-relaxed text-charcoal/75 dark:text-foreground/75">
                        Made for anniversaries, weddings, birthdays, 18th debuts, baptisms, graduations and every trip you take. Browse
                        <a href="{{ route('categories.index') }}" class="{{ $inlineLink }}">gifts by occasion</a>, see our
                        <a href="{{ route('experiences.templates') }}" class="{{ $inlineLink }}">memory page designs</a> or read more
                        <a href="{{ route('pages.about') }}" class="{{ $inlineLink }}">about our studio</a>.
                    </p>
                </div>
                <div class="rounded-3xl bg-blush-light/50 p-6 dark:bg-card">
                    <h3 class="font-display text-xl">Where we deliver</h3>
                    <p class="mt-2 text-sm text-charcoal/70 dark:text-foreground/70">
                        For now we deliver to {{ $business['town'] }} and these nearby towns and cities in {{ $business['province'] }}:
                    </p>
                    <ul class="mt-4 flex flex-wrap gap-2">
                        @foreach ($business['service_area'] as $place)
                            <li class="rounded-full bg-white/80 px-3 py-1 text-sm text-plum dark:bg-background dark:text-blush">{{ $place }}</li>
                        @endforeach
                    </ul>
                    <a href="{{ route('pages.shipping') }}" class="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-plum hover:underline dark:text-blush">
                        Delivery areas and fees {!! $heroIcon($arrowRight, 'size-4') !!}
                    </a>
                </div>
            </div>
        </section>

        {{-- The occasions React shows as cards, as a plain list of links for search engines that don't run JavaScript. --}}
        <section class="mx-auto max-w-7xl px-4 pt-20 sm:px-6 lg:px-8">
            <p class="mb-3 text-xs font-semibold tracking-[0.25em] text-rose uppercase">Shop by occasion</p>
            <h2 class="font-display text-3xl leading-tight font-medium sm:text-4xl">A keepsake for every chapter</h2>
            <ul class="mt-10 grid gap-x-10 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
                @foreach ($page['props']['categories'] ?? [] as $category)
                    <li>
                        <a href="{{ route('categories.show', $category['slug']) }}" class="font-display text-xl text-plum hover:underline dark:text-blush">{{ $category['name'] }}</a>
                        @if (filled($category['tagline']))
                            <p class="mt-1 text-sm leading-relaxed text-charcoal/70 dark:text-foreground/70">{{ $category['tagline'] }}</p>
                        @endif
                    </li>
                @endforeach
            </ul>
        </section>

        {{-- <Faqs> in home.tsx. React shows it further down the page; it sits here so search engines that don't run JavaScript still read it. --}}
        <section class="mx-auto max-w-7xl px-4 pt-20 sm:px-6 lg:px-8">
            <div class="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:gap-16">
                <div class="lg:sticky lg:top-28 lg:self-start">
                    <p class="mb-3 text-xs font-semibold tracking-[0.25em] text-rose uppercase">Good to know</p>
                    <h2 class="font-display text-3xl leading-tight font-medium sm:text-4xl">Questions before you order</h2>
                    <p class="mt-4 text-muted-foreground">Tap a question to see the answer.</p>
                </div>
                <div class="space-y-3">
                    @foreach ($page['props']['faqs'] ?? [] as $faq)
                        <details name="faq" @if ($loop->first) open @endif class="group rounded-2xl border border-plum/10 bg-white/60 transition-colors duration-300 open:border-rose/30 open:bg-white open:shadow-sm hover:border-rose/30 dark:border-border dark:bg-card/50 dark:open:bg-card">
                            <summary class="flex cursor-pointer list-none items-center justify-between gap-4 rounded-2xl px-5 py-4 outline-none focus-visible:ring-2 focus-visible:ring-rose/50 sm:px-6 [&::-webkit-details-marker]:hidden">
                                <h3 class="font-display text-lg leading-snug sm:text-xl">{{ $faq['question'] }}</h3>
                                <span class="flex size-8 shrink-0 items-center justify-center rounded-full bg-blush-light text-plum transition duration-300 group-open:rotate-45 group-open:bg-plum group-open:text-white dark:bg-plum/30 dark:text-blush">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4" aria-hidden="true"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
                                </span>
                            </summary>
                            <p class="px-5 pb-5 leading-relaxed text-charcoal/75 group-open:animate-fade-up sm:px-6 dark:text-foreground/75">{{ $faq['answer'] }}</p>
                        </details>
                    @endforeach
                </div>
            </div>
        </section>
    </main>

    {{-- Stand-in for <SiteFooter> in storefront-layout.tsx until React mounts. --}}
    <footer class="mt-20 bg-charcoal text-cream">
        <div class="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-14 text-sm text-cream/75 sm:px-6 lg:px-8">
            <p class="font-display text-2xl text-blush italic">Every tap tells a story.</p>
            <p>Personalized keepsakes that join the things you can hold with the memories you never want to lose. Handmade with love in {{ $business['town'] }}, {{ $business['province'] }}.</p>
            <nav aria-label="Taptale" class="flex flex-wrap gap-x-6 gap-y-2">
                <a href="{{ route('orders.create') }}" class="hover:text-white">Start creating</a>
                <a href="{{ route('pages.about') }}" class="hover:text-white">Who we are</a>
                <a href="{{ route('pages.shipping') }}" class="hover:text-white">Shipping &amp; delivery</a>
                <a href="{{ route('pages.returns') }}" class="hover:text-white">Returns &amp; refunds</a>
                <a href="{{ route('pages.terms') }}" class="hover:text-white">Terms</a>
                <a href="{{ route('pages.privacy') }}" class="hover:text-white">Privacy</a>
                @if (filled($business['facebook_url']))
                    <a href="{{ $business['facebook_url'] }}" target="_blank" rel="noreferrer" class="hover:text-white">Facebook</a>
                @endif
                @if (filled($business['instagram_url']))
                    <a href="{{ $business['instagram_url'] }}" target="_blank" rel="noreferrer" class="hover:text-white">Instagram</a>
                @endif
            </nav>
        </div>
    </footer>
</div>
