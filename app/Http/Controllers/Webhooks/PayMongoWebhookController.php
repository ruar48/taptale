<?php

namespace App\Http\Controllers\Webhooks;

use App\Actions\Payments\ConfirmPayMongoPayment;
use App\Actions\Payments\PayMongoClient;
use App\Http\Controllers\Controller;
use App\Models\Payment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PayMongoWebhookController extends Controller
{
    /**
     * Receive a signed PayMongo event (see VerifyPayMongoSignature).
     *
     * Even a correctly signed event is only a hint: the checkout session is
     * re-fetched from PayMongo's API before anything is marked as paid.
     */
    public function __invoke(Request $request, PayMongoClient $payMongo, ConfirmPayMongoPayment $confirmPayment): JsonResponse
    {
        $gatewayId = match ($request->json('data.attributes.type')) {
            'checkout_session.payment.paid' => (string) $request->json('data.attributes.data.id'),
            'payment.paid' => (string) $request->json('data.attributes.data.attributes.payment_intent_id'),
            default => '',
        };

        $payment = $gatewayId === ''
            ? null
            : Payment::query()->where('gateway_checkout_id', $gatewayId)->first();

        if ($payment !== null) {
            $confirmPayment->handle($payment, $payMongo->retrieve($gatewayId));
        }

        return response()->json(['received' => true]);
    }
}
