{{--
    Server-rendered SEO tags, so search engines and link previews (Facebook, Messenger,
    Viber) see them without running JavaScript. Storefront controllers opt a page into
    indexing by passing a "seo" prop; every other page is noindexed.
--}}
@php
    /** @var array{title?: string, description?: string, image?: string, type?: string, schema?: array<int, array<string, mixed>>}|null $seo */
    $seo = $page['props']['seo'] ?? null;
    $brand = config('taptale.business.name', 'Taptale');
    $title = filled($seo['title'] ?? null) ? "{$brand} | {$seo['title']}" : $brand;
    $description = $seo['description'] ?? config('taptale.seo.description');
    $image = url($seo['image'] ?? config('taptale.seo.image'));
    $canonical = url()->current();
@endphp
<title>{{ $title }}</title>
<meta name="description" content="{{ $description }}">
@if ($seo === null)
    <meta name="robots" content="noindex, nofollow">
@else
    <meta name="robots" content="index, follow, max-image-preview:large">
    <link rel="canonical" href="{{ $canonical }}">

    <meta property="og:site_name" content="{{ $brand }}">
    <meta property="og:locale" content="{{ config('taptale.seo.locale') }}">
    <meta property="og:type" content="{{ $seo['type'] ?? 'website' }}">
    <meta property="og:title" content="{{ $title }}">
    <meta property="og:description" content="{{ $description }}">
    <meta property="og:url" content="{{ $canonical }}">
    <meta property="og:image" content="{{ $image }}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="{{ $title }}">
    <meta name="twitter:description" content="{{ $description }}">
    <meta name="twitter:image" content="{{ $image }}">

    @foreach ($seo['schema'] ?? [] as $schema)
        <script type="application/ld+json">{!! json_encode($schema, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_HEX_TAG) !!}</script>
    @endforeach
@endif
