<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Currency
    |--------------------------------------------------------------------------
    |
    | All prices are stored as integers in the smallest currency unit
    | (centavos). The symbol is used when presenting prices.
    |
    */

    'currency' => env('TAPTALE_CURRENCY', 'PHP'),

    'currency_symbol' => env('TAPTALE_CURRENCY_SYMBOL', '₱'),

    /*
    |--------------------------------------------------------------------------
    | Delivery
    |--------------------------------------------------------------------------
    |
    | Flat delivery fee (centavos) and an optional subtotal (centavos) above
    | which delivery becomes free. Set the threshold to 0 to disable it.
    |
    */

    'delivery_fee' => (int) env('TAPTALE_DELIVERY_FEE', 15000),

    'free_delivery_threshold' => (int) env('TAPTALE_FREE_DELIVERY_THRESHOLD', 300000),

    /*
    |--------------------------------------------------------------------------
    | Storage
    |--------------------------------------------------------------------------
    |
    | "media_disk" stores public catalog imagery (product photos, template
    | previews). "uploads_disk" stores private customer files (photos,
    | proofs, payment receipts). Point either to "s3" to use external
    | object storage.
    |
    */

    'media_disk' => env('TAPTALE_MEDIA_DISK', 'public'),

    'uploads_disk' => env('TAPTALE_UPLOADS_DISK', 'local'),

    'max_upload_kilobytes' => (int) env('TAPTALE_MAX_UPLOAD_KB', 10240),

    /*
    |--------------------------------------------------------------------------
    | Business details
    |--------------------------------------------------------------------------
    |
    | Shown on the About, policy and legal pages and in the site footer.
    | Leave a value empty to hide it. "policies_updated_on" is the
    | "Last updated" date printed on the legal pages; change it whenever
    | the policy wording changes.
    |
    */

    'business' => [
        'name' => env('TAPTALE_BUSINESS_NAME', 'Taptale'),
        'email' => env('TAPTALE_CONTACT_EMAIL', env('MAIL_FROM_ADDRESS')),
        'phone' => env('TAPTALE_CONTACT_PHONE'),
        'address' => env('TAPTALE_BUSINESS_ADDRESS'),
        'facebook_url' => env('TAPTALE_FACEBOOK_URL'),
        'instagram_url' => env('TAPTALE_INSTAGRAM_URL'),
    ],

    'policies_updated_on' => env('TAPTALE_POLICIES_UPDATED_ON', '2026-11-22'),

    /*
    |--------------------------------------------------------------------------
    | Search engines & link previews
    |--------------------------------------------------------------------------
    |
    | Defaults for the <meta> tags rendered in app.blade.php. Storefront
    | controllers pass a "seo" prop to override them per page; pages
    | without one (accounts, admin, private memory pages) are noindexed.
    |
    */

    'seo' => [
        'description' => 'Personalized NFC keychains, photo keepsakes and memory pages from the Philippines. Turn your photos, videos and messages into a gift they can tap to relive.',
        'image' => '/image/taptale-og.jpg',
        'locale' => 'en_PH',
    ],

];
