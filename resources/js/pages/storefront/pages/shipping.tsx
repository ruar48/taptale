import { Link, usePage } from '@inertiajs/react';
import { ContactInline, LegalPage } from '@/components/taptale/legal-page';
import { useMoney } from '@/hooks/use-money';
import { index as accountOrders } from '@/routes/account/orders';
import { returns } from '@/routes/pages';

export default function Shipping() {
    const money = useMoney();
    const { deliveryFee, freeDeliveryThreshold } = usePage().props.storefront;

    return (
        <LegalPage
            title="Shipping & delivery"
            intro={
                <p>
                    Every gift is made to order, then delivered to your door
                    anywhere in the Philippines. Here's how long it takes and
                    what it costs.
                </p>
            }
            sections={[
                {
                    id: 'timeline',
                    title: 'How long it takes',
                    content: (
                        <>
                            <p>Your order goes through three stages:</p>
                            <ol>
                                <li>
                                    <strong>Payment and design.</strong> Once
                                    your payment is confirmed, our designers
                                    prepare your design. If a proof is needed,
                                    we send it to your account for approval. The
                                    sooner you approve, the sooner we can start.
                                </li>
                                <li>
                                    <strong>Production.</strong> Production
                                    starts after you approve your design. Each
                                    product page shows its usual production
                                    time, typically a few working days. Large
                                    orders and busy seasons (such as Valentine's
                                    Day and Christmas) can take longer.
                                </li>
                                <li>
                                    <strong>Delivery.</strong> After we hand
                                    your gift to the courier, delivery usually
                                    takes about 1–3 working days within Metro
                                    Manila and 3–7 working days for other areas,
                                    depending on the courier and location.
                                </li>
                            </ol>
                            <p>
                                Need it by a certain date? Tell us in your order
                                notes or contact us before ordering and we'll
                                let you know if we can make it.
                            </p>
                        </>
                    ),
                },
                {
                    id: 'fees',
                    title: 'Delivery fees',
                    content: (
                        <ul>
                            <li>
                                Standard delivery is a flat{' '}
                                <strong>{money(deliveryFee)}</strong> per order.
                            </li>
                            {freeDeliveryThreshold > 0 && (
                                <li>
                                    Delivery is{' '}
                                    <strong>free on orders over</strong>{' '}
                                    <strong>
                                        {money(freeDeliveryThreshold)}
                                    </strong>{' '}
                                    (before delivery).
                                </li>
                            )}
                            <li>
                                Your exact delivery fee is shown in your order
                                summary before you place the order.
                            </li>
                        </ul>
                    ),
                },
                {
                    id: 'tracking',
                    title: 'Tracking your order',
                    content: (
                        <p>
                            You can follow every step, from payment to delivery,
                            in <Link href={accountOrders()}>My orders</Link>.
                            Once your gift ships, we add the courier and
                            tracking number there.
                        </p>
                    ),
                },
                {
                    id: 'address',
                    title: 'Delivery address and failed deliveries',
                    content: (
                        <ul>
                            <li>
                                Please double-check the recipient's name, phone
                                number and full address. Contact us as soon as
                                possible if something needs to change; we can't
                                change the address once the order has shipped.
                            </li>
                            <li>
                                Make sure someone can receive the parcel. If a
                                delivery fails because of a wrong address or
                                because no one was available, the courier may
                                return it to us and a new delivery fee may
                                apply.
                            </li>
                        </ul>
                    ),
                },
                {
                    id: 'memory-pages',
                    title: 'Memory pages',
                    content: (
                        <p>
                            Memory pages don't need shipping. You can add and
                            edit your photos, message and music from your
                            account, and the page opens as soon as the gift is
                            tapped or scanned.
                        </p>
                    ),
                },
                {
                    id: 'problems',
                    title: 'Lost or damaged parcels',
                    content: (
                        <p>
                            If your parcel arrives damaged, or tracking shows it
                            delivered but you didn't receive it, contact us at{' '}
                            <ContactInline /> within 7 days. We'll work with the
                            courier and replace or refund your order as
                            explained in our{' '}
                            <Link href={returns()}>
                                Returns & refunds policy
                            </Link>
                            .
                        </p>
                    ),
                },
            ]}
        />
    );
}
