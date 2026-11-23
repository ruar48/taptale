import { Head, usePage } from '@inertiajs/react';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMoney } from '@/hooks/use-money';
import { formatDate } from '@/lib/money';
import type { Order } from '@/types';

/**
 * A plain, printable slip to put in the parcel. Gift orders leave every
 * price off, since the recipient opens the box.
 */
export default function PackingSlip({ order }: { order: Order }) {
    const money = useMoney();
    const business = usePage().props.storefront.business;
    const showPrices = !order.is_gift;

    return (
        <>
            <Head title={`Packing slip ${order.reference}`} />
            <div className="min-h-screen bg-muted/40 py-8 print:bg-white print:py-0">
                <div className="mx-auto mb-4 flex max-w-2xl justify-end px-4 print:hidden">
                    <Button onClick={() => window.print()}>
                        <Printer className="size-4" /> Print
                    </Button>
                </div>

                <article className="mx-auto max-w-2xl bg-white p-8 text-sm text-neutral-900 shadow-sm print:max-w-none print:p-0 print:shadow-none">
                    <header className="flex items-start justify-between gap-6 border-b pb-6">
                        <div>
                            <p className="font-display text-2xl font-semibold">
                                {business.name}
                            </p>
                            <p className="mt-1 text-xs text-neutral-500">
                                Every tap tells a story.
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs tracking-widest text-neutral-500 uppercase">
                                Packing slip
                            </p>
                            <p className="mt-1 font-mono text-base font-semibold">
                                {order.reference}
                            </p>
                            <p className="text-xs text-neutral-500">
                                {formatDate(order.created_at)}
                            </p>
                        </div>
                    </header>

                    <section className="mt-6">
                        <p className="text-xs tracking-widest text-neutral-500 uppercase">
                            Ship to
                        </p>
                        <address className="mt-1 leading-relaxed not-italic">
                            <span className="font-semibold">
                                {order.customer_name}
                            </span>
                            <br />
                            {order.address_line}
                            <br />
                            {order.city}, {order.province} {order.postal_code}
                            <br />
                            {order.customer_phone}
                        </address>
                    </section>

                    <table className="mt-6 w-full border-collapse">
                        <thead>
                            <tr className="border-b text-left text-xs tracking-widest text-neutral-500 uppercase">
                                <th className="py-2 font-medium">Item</th>
                                <th className="py-2 text-right font-medium">
                                    Qty
                                </th>
                                {showPrices && (
                                    <th className="py-2 text-right font-medium">
                                        Amount
                                    </th>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border-b align-top">
                                <td className="py-3">
                                    <p className="font-medium">
                                        {order.product_name}
                                    </p>
                                    {order.selected_options.length > 0 && (
                                        <p className="mt-0.5 text-xs text-neutral-500">
                                            {order.selected_options
                                                .map(
                                                    (option) =>
                                                        `${option.group_label}: ${option.name}`,
                                                )
                                                .join(' · ')}
                                        </p>
                                    )}
                                    {order.template_name && (
                                        <p className="text-xs text-neutral-500">
                                            Design: {order.template_name}
                                        </p>
                                    )}
                                </td>
                                <td className="py-3 text-right">
                                    {order.quantity}
                                </td>
                                {showPrices && (
                                    <td className="py-3 text-right">
                                        {money(order.subtotal)}
                                    </td>
                                )}
                            </tr>
                        </tbody>
                        {showPrices && (
                            <tfoot>
                                {order.discount > 0 && (
                                    <SlipLine
                                        label={`Promo ${order.promo_code ?? ''}`}
                                        value={`−${money(order.discount)}`}
                                    />
                                )}
                                {order.customization_fee > 0 && (
                                    <SlipLine
                                        label="Design service"
                                        value={money(order.customization_fee)}
                                    />
                                )}
                                {order.flowers_fee > 0 && (
                                    <SlipLine
                                        label="Flowers on tap page"
                                        value={money(order.flowers_fee)}
                                    />
                                )}
                                <SlipLine
                                    label="Delivery"
                                    value={
                                        order.delivery_fee === 0
                                            ? 'Free'
                                            : money(order.delivery_fee)
                                    }
                                />
                                {order.adjustment !== 0 && (
                                    <SlipLine
                                        label="Adjustment"
                                        value={money(order.adjustment)}
                                    />
                                )}
                                <tr className="font-semibold">
                                    <td className="pt-3" colSpan={2}>
                                        Total
                                    </td>
                                    <td className="pt-3 text-right">
                                        {money(order.total)}
                                    </td>
                                </tr>
                            </tfoot>
                        )}
                    </table>

                    {order.is_gift && (
                        <section className="mt-8 rounded-xl border border-dashed p-5 text-center">
                            <p className="text-xs tracking-widest text-neutral-500 uppercase">
                                A gift for you
                            </p>
                            {order.gift_message && (
                                <p className="mt-2 font-script text-2xl leading-snug whitespace-pre-line">
                                    {order.gift_message}
                                </p>
                            )}
                        </section>
                    )}

                    <footer className="mt-10 border-t pt-4 text-center text-xs text-neutral-500">
                        Thank you for choosing {business.name}
                        {business.email ? ` · ${business.email}` : ''}
                    </footer>
                </article>
            </div>
        </>
    );
}

function SlipLine({ label, value }: { label: string; value: string }) {
    return (
        <tr className="text-neutral-600">
            <td className="pt-2" colSpan={2}>
                {label}
            </td>
            <td className="pt-2 text-right">{value}</td>
        </tr>
    );
}
