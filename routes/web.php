<?php

use App\Http\Controllers\Account;
use App\Http\Controllers\Admin;
use App\Http\Controllers\PrivateFileController;
use App\Http\Controllers\Storefront;
use App\Http\Controllers\Webhooks;
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
Route::get('templates', Storefront\TemplateGalleryController::class)->name('templates.index');

/*
| About and policy pages. Business details come from config('taptale.business').
*/
Route::name('pages.')->group(function () {
    Route::inertia('about', 'storefront/pages/about')->name('about');
    Route::inertia('terms', 'storefront/pages/terms')->name('terms');
    Route::inertia('privacy', 'storefront/pages/privacy')->name('privacy');
    Route::inertia('cookies', 'storefront/pages/cookies')->name('cookies');
    Route::inertia('shipping', 'storefront/pages/shipping')->name('shipping');
    Route::inertia('returns', 'storefront/pages/returns')->name('returns');
});

/*
| NFC tags and QR codes point here. Kept on the main domain on purpose.
*/
Route::get('memory-pages', [Storefront\ExperienceController::class, 'templates'])->name('experiences.templates');
Route::get('memory-pages/{template}', [Storefront\ExperienceController::class, 'demo'])->name('experiences.demo');
Route::get('t/{experience}', [Storefront\ExperienceController::class, 'show'])->name('experiences.show');
Route::get('t/{experience}/audio', [Storefront\ExperienceController::class, 'audio'])->name('experiences.audio');
Route::get('t/{experience}/qr', [Storefront\ExperienceController::class, 'qr'])->name('experiences.qr');
Route::get('t/{experience}/photos/{index}', [Storefront\ExperienceController::class, 'photo'])
    ->whereNumber('index')
    ->name('experiences.photo');

/*
| Anyone can craft a gift. Guests create an account (or log in) at the
| checkout step without leaving the wizard, and the email is confirmed
| before the order is placed (see StoreOrderRequest).
*/
Route::get('create', [Storefront\OrderWizardController::class, 'create'])->name('orders.create');

Route::middleware('auth')->group(function () {
    Route::post('orders', [Storefront\OrderWizardController::class, 'store'])
        ->middleware('throttle:10,1')
        ->name('orders.store');
});

/*
| PayMongo server-to-server events. Excluded from CSRF (bootstrap/app.php);
| every request must carry a valid PayMongo signature instead.
*/
Route::post('webhooks/paymongo', Webhooks\PayMongoWebhookController::class)
    ->middleware(['throttle:120,1', VerifyPayMongoSignature::class])
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
        Route::post('orders/{order}/cancel', [Account\OrderController::class, 'cancel'])->name('orders.cancel');
        Route::post('orders/{order}/files', [Account\OrderFileController::class, 'store'])->name('orders.files.store');
        Route::post('orders/{order}/payments', [Account\PaymentController::class, 'store'])->name('orders.payments.store');
        Route::post('orders/{order}/checkout', [Account\OnlinePaymentController::class, 'store'])
            ->middleware('throttle:6,1')
            ->name('orders.checkout');
        Route::get('orders/{order}/checkout/complete', [Account\OnlinePaymentController::class, 'complete'])
            ->middleware('throttle:20,1')
            ->name('orders.checkout.complete');
        Route::post('orders/{order}/qrph', [Account\QrPhPaymentController::class, 'store'])
            ->middleware('throttle:6,1')
            ->name('orders.qrph.store');
        Route::get('orders/{order}/qrph', [Account\QrPhPaymentController::class, 'show'])
            ->middleware('throttle:40,1')
            ->name('orders.qrph.show');
        Route::post('orders/{order}/proofs/{proof}/approve', [Account\DesignProofController::class, 'approve'])->name('orders.proofs.approve');
        Route::post('orders/{order}/proofs/{proof}/revision', [Account\DesignProofController::class, 'requestRevision'])->name('orders.proofs.revision');

        Route::get('experiences/{experience}', [Account\ExperienceController::class, 'edit'])->name('experiences.edit');
        Route::put('experiences/{experience}', [Account\ExperienceController::class, 'update'])->name('experiences.update');
        Route::patch('experiences/{experience}/content', [Account\ExperienceContentController::class, 'update'])
            ->middleware('throttle:60,1')
            ->name('experiences.content');
        Route::post('experiences/{experience}/photos/{index}', [Account\ExperiencePhotoController::class, 'replace'])
            ->whereNumber('index')
            ->middleware('throttle:30,1')
            ->name('experiences.photos.replace');
        Route::put('experiences/{experience}/design', [Account\ExperienceController::class, 'updateDesign'])->name('experiences.design');
        Route::post('experiences/{experience}/photos', [Account\ExperiencePhotoController::class, 'store'])
            ->middleware('throttle:30,1')
            ->name('experiences.photos.store');
    });
});

/*
|--------------------------------------------------------------------------
| Admin dashboard
|--------------------------------------------------------------------------
*/

Route::middleware(['auth', 'verified', 'can:admin'])->prefix('admin')->name('admin.')->group(function () {
    Route::get('/', Admin\DashboardController::class)->name('dashboard');

    Route::resource('categories', Admin\CategoryController::class)->except(['create', 'show', 'edit']);

    Route::resource('products', Admin\ProductController::class)->except(['show']);
    Route::post('products/{product}/options', [Admin\ProductOptionController::class, 'store'])->name('products.options.store');
    Route::put('products/{product}/options/{option}', [Admin\ProductOptionController::class, 'update'])->name('products.options.update');
    Route::delete('products/{product}/options/{option}', [Admin\ProductOptionController::class, 'destroy'])->name('products.options.destroy');
    Route::post('products/{product}/images', [Admin\ProductImageController::class, 'store'])->name('products.images.store');
    Route::put('products/{product}/images/{image}', [Admin\ProductImageController::class, 'update'])->name('products.images.update');
    Route::delete('products/{product}/images/{image}', [Admin\ProductImageController::class, 'destroy'])->name('products.images.destroy');

    Route::resource('templates', Admin\TemplateController::class)->except(['show']);

    Route::get('orders', [Admin\OrderController::class, 'index'])->name('orders.index');
    Route::get('orders/{order}', [Admin\OrderController::class, 'show'])->name('orders.show');
    Route::put('orders/{order}/status', [Admin\OrderController::class, 'updateStatus'])->name('orders.status');
    Route::put('orders/{order}/shipping', [Admin\OrderController::class, 'updateShipping'])->name('orders.shipping');
    Route::put('orders/{order}/adjustment', [Admin\OrderController::class, 'adjust'])->name('orders.adjust');
    Route::post('orders/{order}/notes', [Admin\OrderController::class, 'storeNote'])->name('orders.notes.store');
    Route::post('orders/{order}/proofs', [Admin\DesignProofController::class, 'store'])->name('orders.proofs.store');
    Route::post('orders/{order}/refunds', [Admin\PaymentController::class, 'refund'])->name('orders.refunds.store');

    Route::get('payments', [Admin\PaymentController::class, 'index'])->name('payments.index');
    Route::post('payments/{payment}/verify', [Admin\PaymentController::class, 'verify'])->name('payments.verify');
    Route::post('payments/{payment}/reject', [Admin\PaymentController::class, 'reject'])->name('payments.reject');

    Route::resource('payment-methods', Admin\PaymentMethodController::class)
        ->parameters(['payment-methods' => 'paymentMethod'])
        ->except(['create', 'show', 'edit']);

    Route::resource('finance', Admin\FinanceController::class)->except(['create', 'show', 'edit']);

    Route::get('customers', [Admin\CustomerController::class, 'index'])->name('customers.index');
    Route::get('customers/{customer}', [Admin\CustomerController::class, 'show'])->name('customers.show');
    Route::put('customers/{customer}', [Admin\CustomerController::class, 'update'])->name('customers.update');

    Route::put('experiences/{experience}', [Admin\ExperienceController::class, 'update'])->name('experiences.update');
});

require __DIR__.'/settings.php';
