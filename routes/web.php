<?php

use App\Http\Controllers\Account;
use App\Http\Controllers\Admin;
use App\Http\Controllers\PrivateFileController;
use App\Http\Controllers\Storefront;
use App\Http\Controllers\Webhooks;
use App\Http\Middleware\EnsureAdminHasTwoFactor;
use App\Http\Middleware\PreventDuplicateSubmissions;
use App\Http\Middleware\RecordAdminAudit;
use App\Http\Middleware\VerifyPayMongoSignature;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Storefront
|--------------------------------------------------------------------------
*/

Route::get('/', Storefront\HomeController::class)->name('home');
Route::get('gifts', [Storefront\CategoryController::class, 'index'])->name('categories.index');
Route::get('gifts/{category}', [Storefront\CategoryController::class, 'show'])->name('categories.show');
Route::get('products/{product}', [Storefront\ProductController::class, 'show'])->name('products.show');
Route::permanentRedirect('templates', 'gifts');

/*
| About and policy pages. Business details come from config('taptale.business').
*/
Route::name('pages.')->group(function () {
    Route::inertia('about', 'storefront/pages/about', ['seo' => [
        'title' => 'Who we are',
        'description' => 'Taptale makes personalized NFC keychains and photo keepsakes by hand in Binalonan, Pangasinan — little gifts that hold a lifetime of memories.',
    ]])->name('about');
    Route::inertia('terms', 'storefront/pages/terms', ['seo' => ['title' => 'Terms of service']])->name('terms');
    Route::inertia('privacy', 'storefront/pages/privacy', ['seo' => ['title' => 'Privacy policy']])->name('privacy');
    Route::inertia('cookies', 'storefront/pages/cookies', ['seo' => ['title' => 'Cookie policy']])->name('cookies');
    Route::inertia('shipping', 'storefront/pages/shipping', ['seo' => [
        'title' => 'Shipping & delivery',
        'description' => 'Taptale delivers personalized gifts in Binalonan, Urdaneta and nearby Pangasinan towns — delivery areas, production times, fees and tracking.',
    ]])->name('shipping');
    Route::inertia('returns', 'storefront/pages/returns', ['seo' => ['title' => 'Returns & refunds']])->name('returns');
});

Route::get('sitemap.xml', Storefront\SitemapController::class)->name('sitemap');
Route::get('llms.txt', [Storefront\HomeController::class, 'llms'])->name('llms');

/*
| NFC tags and QR codes point here. Kept on the main domain on purpose.
*/
Route::get('memory-pages', [Storefront\ExperienceController::class, 'templates'])->name('experiences.templates');
Route::get('memory-pages/{template}', [Storefront\ExperienceController::class, 'demo'])->name('experiences.demo');
Route::get('song-lookup', Storefront\SongLookupController::class)
    ->middleware('throttle:60,1,song-lookup')
    ->name('songs.lookup');
Route::get('t/{experience}', [Storefront\ExperienceController::class, 'show'])
    ->middleware('throttle:300,1,memory-page-views')
    ->name('experiences.show');
Route::post('t/{experience}/heart', [Storefront\ExperienceReactionController::class, 'heart'])
    ->middleware('throttle:60,1,memory-page-hearts')
    ->name('experiences.heart');
Route::post('t/{experience}/replies', [Storefront\ExperienceReactionController::class, 'reply'])
    ->middleware(['throttle:15,1,memory-page-replies', PreventDuplicateSubmissions::class])
    ->name('experiences.replies.store');
Route::post('t/{experience}/share-links', [Storefront\ExperienceShareLinkController::class, 'store'])
    ->middleware('throttle:20,1,memory-page-shares')
    ->name('experiences.share-links.store');
Route::get('t/{experience}/audio', [Storefront\ExperienceController::class, 'audio'])->name('experiences.audio');
Route::get('t/{experience}/video', [Storefront\ExperienceController::class, 'video'])->name('experiences.video');
Route::get('t/{experience}/qr', [Storefront\ExperienceController::class, 'qr'])->name('experiences.qr');
Route::get('t/{experience}/photos/{index}', [Storefront\ExperienceController::class, 'photo'])
    ->whereNumber('index')
    ->name('experiences.photo');
Route::get('t/{experience}/rain-photos/{index}', [Storefront\ExperienceController::class, 'rainPhoto'])
    ->whereNumber('index')
    ->name('experiences.rain-photo');

/*
| Anyone can craft a gift. Guests create an account (or log in) at the
| checkout step without leaving the wizard, and the email is confirmed
| before the order is placed (see StoreOrderRequest).
*/
Route::get('create', [Storefront\OrderWizardController::class, 'create'])->name('orders.create');
Route::get('promo-codes/check', Storefront\PromoCodeController::class)
    ->middleware(['auth', 'throttle:10,1,promo-code-checks'])
    ->name('promo-codes.check');

/*
| The private approval link the studio sends a customer (over Messenger, for
| example) to see and approve their design without an account. Every request
| must carry the order's secret "k" key.
*/
Route::prefix('design/{order}')->name('design-review.')->group(function () {
    Route::get('/', [Storefront\DesignReviewController::class, 'show'])
        ->middleware('throttle:60,1,design-review-views')
        ->name('show');
    Route::get('proofs/{proof}', [Storefront\DesignReviewController::class, 'proof'])
        ->middleware('throttle:120,1,design-review-images')
        ->name('proof');
    Route::post('proofs/{proof}/approve', [Storefront\DesignReviewController::class, 'approve'])
        ->middleware(['throttle:10,1,design-review-responses', PreventDuplicateSubmissions::class])
        ->name('approve');
    Route::post('proofs/{proof}/revision', [Storefront\DesignReviewController::class, 'requestRevision'])
        ->middleware(['throttle:10,1,design-review-responses', PreventDuplicateSubmissions::class])
        ->name('revision');
});

Route::middleware('auth')->group(function () {
    Route::post('orders', [Storefront\OrderWizardController::class, 'store'])
        ->middleware(['throttle:10,1,order-placement', PreventDuplicateSubmissions::class])
        ->name('orders.store');
});

/*
| PayMongo server-to-server events. Excluded from CSRF (bootstrap/app.php);
| every request must carry a valid PayMongo signature instead.
*/
Route::post('webhooks/paymongo', Webhooks\PayMongoWebhookController::class)
    ->middleware(['throttle:120,1,paymongo-webhook', VerifyPayMongoSignature::class])
    ->name('webhooks.paymongo');

Route::middleware('auth')->group(function () {
    Route::get('files/orders/{orderFile}', [PrivateFileController::class, 'orderFile'])->name('files.order');
    Route::get('files/proofs/{proof}', [PrivateFileController::class, 'proof'])->name('files.proof');
    Route::get('files/payments/{payment}', [PrivateFileController::class, 'payment'])->name('files.payment');
});

/*
|--------------------------------------------------------------------------
| Customer account
|--------------------------------------------------------------------------
*/

Route::middleware('auth')->group(function () {
    Route::get('dashboard', Account\DashboardController::class)->name('dashboard');

    Route::prefix('account')->name('account.')->group(function () {
        Route::get('orders', [Account\OrderController::class, 'index'])->name('orders.index');
        Route::get('orders/{order}', [Account\OrderController::class, 'show'])->name('orders.show');
        Route::post('orders/{order}/cancel', [Account\OrderController::class, 'cancel'])
            ->middleware(['throttle:10,1,order-cancels', PreventDuplicateSubmissions::class])
            ->name('orders.cancel');
        Route::post('orders/{order}/files', [Account\OrderFileController::class, 'store'])
            ->middleware(['throttle:10,1,order-file-uploads', PreventDuplicateSubmissions::class])
            ->name('orders.files.store');
        Route::post('orders/{order}/payments', [Account\PaymentController::class, 'store'])
            ->middleware(['throttle:10,1,manual-payments', PreventDuplicateSubmissions::class])
            ->name('orders.payments.store');
        Route::post('orders/{order}/review', [Account\ReviewController::class, 'store'])
            ->middleware(['throttle:6,1,order-reviews', PreventDuplicateSubmissions::class])
            ->name('orders.review.store');
        Route::post('orders/{order}/checkout', [Account\OnlinePaymentController::class, 'store'])
            ->middleware('throttle:6,1,online-checkout')
            ->name('orders.checkout');
        Route::get('orders/{order}/checkout/complete', [Account\OnlinePaymentController::class, 'complete'])
            ->middleware('throttle:20,1,online-checkout-return')
            ->name('orders.checkout.complete');
        Route::post('orders/{order}/qrph', [Account\QrPhPaymentController::class, 'store'])
            ->middleware('throttle:6,1,qrph-codes')
            ->name('orders.qrph.store');
        Route::get('orders/{order}/qrph', [Account\QrPhPaymentController::class, 'show'])
            ->middleware('throttle:40,1,qrph-status')
            ->name('orders.qrph.show');
        Route::post('orders/{order}/proofs/{proof}/approve', [Account\DesignProofController::class, 'approve'])
            ->middleware(PreventDuplicateSubmissions::class)
            ->name('orders.proofs.approve');
        Route::post('orders/{order}/proofs/{proof}/revision', [Account\DesignProofController::class, 'requestRevision'])
            ->middleware(PreventDuplicateSubmissions::class)
            ->name('orders.proofs.revision');
        Route::post('orders/{order}/design', [Account\OrderDesignController::class, 'update'])
            ->middleware(['throttle:30,1,order-design-saves', PreventDuplicateSubmissions::class])
            ->name('orders.design.update');
        Route::post('orders/{order}/design/approve', [Account\OrderDesignController::class, 'approve'])
            ->middleware(['throttle:10,1,order-design-approvals', PreventDuplicateSubmissions::class])
            ->name('orders.design.approve');
        Route::post('orders/{order}/design/submit', [Account\OrderDesignController::class, 'submit'])
            ->middleware(['throttle:10,1,order-design-approvals', PreventDuplicateSubmissions::class])
            ->name('orders.design.submit');

        // Administrators can design a customer's memory page; their changes are audited.
        Route::middleware(RecordAdminAudit::class)->group(function () {
            Route::get('experiences/{experience}', [Account\ExperienceController::class, 'edit'])->name('experiences.edit');
            Route::put('experiences/{experience}', [Account\ExperienceController::class, 'update'])->name('experiences.update');
            Route::patch('experiences/{experience}/content', [Account\ExperienceContentController::class, 'update'])
                ->middleware('throttle:60,1,memory-page-text')
                ->name('experiences.content');
            Route::post('experiences/{experience}/photos/{index}', [Account\ExperiencePhotoController::class, 'replace'])
                ->whereNumber('index')
                ->middleware('throttle:30,1,memory-page-photo-swaps')
                ->name('experiences.photos.replace');
            Route::put('experiences/{experience}/design', [Account\ExperienceController::class, 'updateDesign'])->name('experiences.design');
            Route::post('experiences/{experience}/photos', [Account\ExperiencePhotoController::class, 'store'])
                ->middleware('throttle:30,1,memory-page-photo-uploads')
                ->name('experiences.photos.store');
            Route::post('experiences/{experience}/video', [Account\ExperienceVideoController::class, 'store'])
                ->middleware('throttle:10,1,memory-page-video-uploads')
                ->name('experiences.video.store');
            Route::delete('experiences/{experience}/video', [Account\ExperienceVideoController::class, 'destroy'])
                ->middleware('throttle:30,1,memory-page-video-removals')
                ->name('experiences.video.destroy');
            Route::post('experiences/{experience}/rain-photos', [Account\ExperienceRainPhotoController::class, 'store'])
                ->middleware('throttle:30,1,memory-page-rain-photo-uploads')
                ->name('experiences.rain-photos.store');
            Route::delete('experiences/{experience}/rain-photos/{index}', [Account\ExperienceRainPhotoController::class, 'destroy'])
                ->whereNumber('index')
                ->middleware('throttle:60,1,memory-page-rain-photo-removals')
                ->name('experiences.rain-photos.destroy');
            Route::post('experiences/{experience}/sections', [Account\ExperienceSectionController::class, 'store'])
                ->middleware('throttle:30,1,memory-page-sections')
                ->name('experiences.sections.store');
            Route::patch('experiences/{experience}/sections/{section}', [Account\ExperienceSectionController::class, 'update'])
                ->middleware('throttle:60,1,memory-page-section-edits')
                ->name('experiences.sections.update');
            Route::delete('experiences/{experience}/sections/{section}', [Account\ExperienceSectionController::class, 'destroy'])
                ->middleware('throttle:30,1,memory-page-section-removals')
                ->name('experiences.sections.destroy');
        });
    });
});

/*
|--------------------------------------------------------------------------
| Admin dashboard
|--------------------------------------------------------------------------
*/

Route::middleware(['auth', 'verified', 'can:admin', EnsureAdminHasTwoFactor::class, RecordAdminAudit::class])->prefix('admin')->name('admin.')->group(function () {
    Route::get('/', Admin\DashboardController::class)->name('dashboard');
    Route::get('production', Admin\ProductionController::class)->name('production');
    Route::get('audit-log', Admin\AuditLogController::class)->name('audit-log');

    Route::resource('categories', Admin\CategoryController::class)->except(['create', 'show', 'edit']);

    Route::resource('products', Admin\ProductController::class)->except(['show']);
    Route::post('products/{product}/options', [Admin\ProductOptionController::class, 'store'])->name('products.options.store');
    Route::put('products/{product}/options/{option}', [Admin\ProductOptionController::class, 'update'])->name('products.options.update');
    Route::delete('products/{product}/options/{option}', [Admin\ProductOptionController::class, 'destroy'])->name('products.options.destroy');
    Route::post('products/{product}/images', [Admin\ProductImageController::class, 'store'])->name('products.images.store');
    Route::put('products/{product}/images/{image}', [Admin\ProductImageController::class, 'update'])->name('products.images.update');
    Route::delete('products/{product}/images/{image}', [Admin\ProductImageController::class, 'destroy'])->name('products.images.destroy');

    Route::get('orders', [Admin\OrderController::class, 'index'])->name('orders.index');
    Route::get('orders/create', [Admin\OrderController::class, 'create'])->name('orders.create');
    Route::post('orders', [Admin\OrderController::class, 'store'])
        ->middleware(PreventDuplicateSubmissions::class)
        ->name('orders.store');
    Route::get('orders/export', [Admin\ExportController::class, 'orders'])->name('orders.export');
    Route::get('orders/{order}', [Admin\OrderController::class, 'show'])->name('orders.show');
    Route::get('orders/{order}/packing-slip', [Admin\OrderController::class, 'packingSlip'])->name('orders.packing-slip');
    Route::put('orders/{order}/status', [Admin\OrderController::class, 'updateStatus'])->name('orders.status');
    Route::put('orders/{order}/shipping', [Admin\OrderController::class, 'updateShipping'])->name('orders.shipping');
    Route::put('orders/{order}/adjustment', [Admin\OrderController::class, 'adjust'])->name('orders.adjust');
    Route::post('orders/{order}/notes', [Admin\OrderController::class, 'storeNote'])
        ->middleware(PreventDuplicateSubmissions::class)
        ->name('orders.notes.store');
    Route::post('orders/{order}/approval-link', [Admin\OrderController::class, 'issueApprovalLink'])->name('orders.approval-link.store');
    Route::delete('orders/{order}/approval-link', [Admin\OrderController::class, 'revokeApprovalLink'])->name('orders.approval-link.destroy');
    Route::post('orders/{order}/proofs', [Admin\DesignProofController::class, 'store'])
        ->middleware(PreventDuplicateSubmissions::class)
        ->name('orders.proofs.store');
    Route::post('orders/{order}/payments', [Admin\PaymentController::class, 'record'])
        ->middleware(PreventDuplicateSubmissions::class)
        ->name('orders.payments.store');
    Route::post('orders/{order}/refunds', [Admin\PaymentController::class, 'refund'])
        ->middleware(PreventDuplicateSubmissions::class)
        ->name('orders.refunds.store');

    Route::get('payments', [Admin\PaymentController::class, 'index'])->name('payments.index');
    Route::post('payments/{payment}/verify', [Admin\PaymentController::class, 'verify'])
        ->middleware(PreventDuplicateSubmissions::class)
        ->name('payments.verify');
    Route::post('payments/{payment}/reject', [Admin\PaymentController::class, 'reject'])
        ->middleware(PreventDuplicateSubmissions::class)
        ->name('payments.reject');

    Route::resource('payment-methods', Admin\PaymentMethodController::class)
        ->parameters(['payment-methods' => 'paymentMethod'])
        ->except(['create', 'show', 'edit']);

    Route::get('finance/export', [Admin\ExportController::class, 'finance'])->name('finance.export');
    Route::resource('finance', Admin\FinanceController::class)->except(['create', 'show', 'edit']);

    Route::resource('promo-codes', Admin\PromoCodeController::class)
        ->parameters(['promo-codes' => 'promoCode'])
        ->except(['create', 'show', 'edit']);

    Route::resource('reviews', Admin\ReviewController::class)->only(['index', 'update', 'destroy']);

    Route::get('customers', [Admin\CustomerController::class, 'index'])->name('customers.index');
    Route::get('customers/{customer}', [Admin\CustomerController::class, 'show'])->name('customers.show');
    Route::put('customers/{customer}', [Admin\CustomerController::class, 'update'])->name('customers.update');

    Route::put('experiences/{experience}', [Admin\ExperienceController::class, 'update'])->name('experiences.update');
});

require __DIR__.'/settings.php';
