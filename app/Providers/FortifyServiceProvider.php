<?php

namespace App\Providers;

use App\Actions\Fortify\CreateNewUser;
use App\Actions\Fortify\ResetUserPassword;
use App\Http\Middleware\ThrottleRequestsByNetwork;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Routing\RouteCollection;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Laravel\Fortify\Features;
use Laravel\Fortify\Fortify;

class FortifyServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureActions();
        $this->configureViews();
        $this->configureRateLimiting();
        $this->throttleEmailSendingRoutes();
    }

    /**
     * Sign-up and password-reset requests each send an email. Without a
     * limit, a script could burn through the shop's daily email quota (so
     * order emails stop going out) or bomb strangers' inboxes from our
     * domain. Fortify registers these routes itself, so the limits are
     * attached once every route exists.
     */
    private function throttleEmailSendingRoutes(): void
    {
        $this->app->booted(function (): void {
            $routes = Route::getRoutes();

            if ($routes instanceof RouteCollection) {
                $routes->refreshNameLookups();
            }

            $routes->getByName('register.store')?->middleware('throttle:registrations');
            $routes->getByName('password.email')?->middleware('throttle:password-reset-links');
        });
    }

    /**
     * Configure Fortify actions.
     */
    private function configureActions(): void
    {
        Fortify::resetUserPasswordsUsing(ResetUserPassword::class);
        Fortify::createUsersUsing(CreateNewUser::class);
    }

    /**
     * Configure Fortify views.
     */
    private function configureViews(): void
    {
        Fortify::loginView(fn (Request $request) => Inertia::render('auth/login', [
            'canResetPassword' => Features::enabled(Features::resetPasswords()),
            'status' => $request->session()->get('status'),
        ]));

        Fortify::resetPasswordView(fn (Request $request) => Inertia::render('auth/reset-password', [
            'email' => $request->email,
            'token' => $request->route('token'),
            'passwordRules' => Password::defaults()->toPasswordRulesString(),
        ]));

        Fortify::requestPasswordResetLinkView(fn (Request $request) => Inertia::render('auth/forgot-password', [
            'status' => $request->session()->get('status'),
        ]));

        Fortify::verifyEmailView(fn (Request $request) => Inertia::render('auth/verify-email', [
            'status' => $request->session()->get('status'),
        ]));

        Fortify::registerView(fn () => Inertia::render('auth/register', [
            'passwordRules' => Password::defaults()->toPasswordRulesString(),
        ]));

        Fortify::twoFactorChallengeView(fn () => Inertia::render('auth/two-factor-challenge'));

        Fortify::confirmPasswordView(fn () => Inertia::render('auth/confirm-password'));
    }

    /**
     * Configure rate limiting.
     */
    private function configureRateLimiting(): void
    {
        RateLimiter::for('two-factor', function (Request $request) {
            return Limit::perMinute(5)->by($request->session()->get('login.id'));
        });

        /*
         * Five tries per account from one network, and at most thirty tries a
         * minute from one network across all accounts, which stops one
         * machine stuffing leaked passwords into many accounts.
         *
         * There is deliberately no per-account limit across networks: it
         * would let anyone lock a customer out of their own account, while
         * production passwords (12+ characters, mixed, checked against known
         * breaches) cannot be guessed at any rate a limit would allow.
         */
        RateLimiter::for('login', function (Request $request) {
            $email = $request->input(Fortify::username());
            $network = ThrottleRequestsByNetwork::visitorKey($request);

            return [
                Limit::perMinute(5)->by('account:'.Str::transliterate(Str::lower(is_string($email) ? $email : '')).'|'.$network),
                Limit::perMinute(30)->by('network:'.$network),
            ];
        });

        RateLimiter::for('registrations', fn (Request $request) => Limit::perMinutes(10, 5)->by(ThrottleRequestsByNetwork::visitorKey($request)));

        RateLimiter::for('password-reset-links', fn (Request $request) => Limit::perMinutes(10, 5)->by(ThrottleRequestsByNetwork::visitorKey($request)));

        RateLimiter::for('passkeys', function (Request $request) {
            $credential = $request->input('credential.id');

            return Limit::perMinute(10)->by(
                (is_string($credential) && $credential !== '' ? $credential : $request->session()->getId()).'|'.ThrottleRequestsByNetwork::visitorKey($request),
            );
        });
    }
}
