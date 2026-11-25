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
    | Memory page add-ons
    |--------------------------------------------------------------------------
    |
    | Price (centavos), charged once per order, for putting the blooming
    | flowers on a memory page design other than "A Bouquet For You", where
    | the flowers are already included.
    |
    */

    'flowers_addon_price' => (int) env('TAPTALE_FLOWERS_ADDON_PRICE', 500),

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
     * Largest video file (kilobytes) a customer can upload to their memory
     * page. Videos fill storage fast, so bigger ones are added by the team on
     * request, or linked from YouTube. The web server's own upload limits
     * (PHP upload_max_filesize and post_max_size) must allow this size.
     */
    'max_video_kilobytes' => (int) env('TAPTALE_MAX_VIDEO_KB', 51200),

    /*
    |--------------------------------------------------------------------------
    | Order abuse limits
    |--------------------------------------------------------------------------
    |
    | "max_unpaid_orders": how many orders a customer may have waiting for
    | payment at once, so one account cannot flood the shop (storage, admin
    | email, the order list) with orders it never pays. "promo_hold_hours":
    | how long an unpaid order keeps its promo code use reserved before the
    | use is free for other customers again.
    |
    */

    'max_unpaid_orders' => (int) env('TAPTALE_MAX_UNPAID_ORDERS', 3),

    // Orders one customer may place in 24 hours, cancelled ones included.
    'max_orders_per_day' => (int) env('TAPTALE_MAX_ORDERS_PER_DAY', 5),

    // Unpaid orders older than this are cancelled and their uploads deleted.
    'abandoned_order_days' => (int) env('TAPTALE_ABANDONED_ORDER_DAYS', 14),

    // A design proof the customer neither approves nor asks to change within
    // this many hours is approved automatically (0 turns this off). Keep the
    // Terms of service in step when changing it.
    'proof_auto_approve_hours' => (int) env('TAPTALE_PROOF_AUTO_APPROVE_HOURS', 24),

    'promo_hold_hours' => (int) env('TAPTALE_PROMO_HOLD_HOURS', 48),

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

        /*
         * Where the studio is and the towns it delivers to. Shown on the
         * homepage and shipping page and in the search engine markup, so
         * Google matches the shop to people searching nearby.
         */
        'town' => env('TAPTALE_BUSINESS_TOWN', 'Binalonan'),
        'province' => env('TAPTALE_BUSINESS_PROVINCE', 'Pangasinan'),
        // The studio's map pin (right-click it in Google Maps to copy them).
        'latitude' => env('TAPTALE_BUSINESS_LATITUDE'),
        'longitude' => env('TAPTALE_BUSINESS_LONGITUDE'),
        'service_area' => [
            'Binalonan',
            'Urdaneta City',
            'Pozorrubio',
            'Laoac',
            'Manaoag',
            'San Manuel',
            'Asingan',
            'Sison',
            'Villasis',
            'Dagupan City',
        ],
    ],

    'policies_updated_on' => env('TAPTALE_POLICIES_UPDATED_ON', '2026-11-24'),

    /*
    | Calendar dates the team enters (promo code start and end days) are
    | read in this time zone.
    */

    'timezone' => env('TAPTALE_TIMEZONE', 'Asia/Manila'),

    /*
    |--------------------------------------------------------------------------
    | Email notifications
    |--------------------------------------------------------------------------
    |
    | Queue connection used to send order and memory page emails. "deferred"
    | sends them right after the response, so no queue worker is needed on
    | shared hosting. Switch to "database" once a worker runs.
    |
    */

    'notifications_connection' => env('TAPTALE_NOTIFICATIONS_CONNECTION', 'deferred'),

    /*
    |--------------------------------------------------------------------------
    | Admin security
    |--------------------------------------------------------------------------
    |
    | When on, administrators must turn on two-factor authentication before
    | they can open the admin dashboard.
    |
    */

    'admin_requires_two_factor' => (bool) env('TAPTALE_ADMIN_REQUIRES_TWO_FACTOR', true),

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
        'description' => 'Personalized NFC keychains and photo keepsakes made in Binalonan, Pangasinan. Delivered to Urdaneta, Pozorrubio, Manaoag and nearby towns.',
        'image' => '/image/taptale-og.jpg',
        'locale' => 'en_PH',
    ],

];
