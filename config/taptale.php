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

];
