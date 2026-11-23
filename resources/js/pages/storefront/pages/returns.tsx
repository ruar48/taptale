import { Link } from "@inertiajs/react";
import { ContactInline, LegalPage } from "@/components/taptale/legal-page";
import { index as accountOrders } from "@/routes/account/orders";

export default function Returns() {
    return (
        <LegalPage
            title="Returns & refunds"
            intro={
                <p>
                    Every gift we make is personalized for one person, so we
                    can't resell it. That's why we check every design with you
                    before we make it. If something still goes wrong on our
                    side, we'll make it right.
                </p>
            }
            sections={[
                {
                    id: "we-will-fix",
                    title: "When we'll replace or refund your order",
                    content: (
                        <>
                            <p>
                                We'll replace your item for free, or refund you
                                if a replacement isn't possible, when:
                            </p>
                            <ul>
                                <li>it arrives damaged or broken;</li>
                                <li>
                                    it has a manufacturing defect, such as a
                                    misprint or an NFC tag or QR code that
                                    doesn't work;
                                </li>
                                <li>
                                    it doesn't match the design you approved; or
                                </li>
                                <li>you received the wrong item.</li>
                            </ul>
                            <p>
                                This doesn't limit your rights under the
                                Consumer Act of the Philippines.
                            </p>
                        </>
                    ),
                },
                {
                    id: "not-covered",
                    title: "What isn't covered",
                    content: (
                        <>
                            <p>
                                Because items are made to order, we can't accept
                                returns or offer refunds for:
                            </p>
                            <ul>
                                <li>a change of mind;</li>
                                <li>
                                    mistakes in a design you approved, whether
                                    you customized it yourself with the live
                                    preview or approved a proof from us, such as
                                    a misspelled name, a wrong date or a photo
                                    you chose. Approved designs are final;
                                </li>
                                <li>
                                    small differences in color between your
                                    screen and the finished item, or natural
                                    variation in handmade materials;
                                </li>
                                <li>
                                    low print quality from low-resolution photos
                                    you sent after we warned you about them; or
                                </li>
                                <li>
                                    damage from normal wear, misuse or accidents
                                    after delivery.
                                </li>
                            </ul>
                        </>
                    ),
                },
                {
                    id: "how-to-claim",
                    title: "How to report a problem",
                    content: (
                        <ol>
                            <li>
                                Contact us at <ContactInline />{" "}
                                <strong>within 7 days of delivery</strong>.
                                Include your order reference (for example, from{" "}
                                <Link href={accountOrders()}>My orders</Link>
                                ).
                            </li>
                            <li>
                                Send clear photos of the item and packaging. An
                                unboxing video helps a lot for damaged parcels.
                            </li>
                            <li>
                                Keep the item and packaging until we've reviewed
                                your report. We may ask you to send the item
                                back; if so, we'll cover the return shipping.
                            </li>
                        </ol>
                    ),
                },
                {
                    id: "cancellations",
                    title: "Cancelling an order",
                    content: (
                        <ul>
                            <li>
                                <strong>Before you pay:</strong> you can cancel
                                from your account at no cost while the order is
                                pending or waiting for payment.
                            </li>
                            <li>
                                <strong>Cash on delivery:</strong> work starts
                                right after you order, so contact us as soon as
                                possible if you need to cancel. The same rules
                                below apply.
                            </li>
                            <li>
                                <strong>
                                    After you pay, before design work starts:
                                </strong>{" "}
                                contact us and we'll cancel the order and refund
                                you in full.
                            </li>
                            <li>
                                <strong>After design work starts:</strong> we
                                can still cancel before production, but we may
                                keep the design or customization fee for work
                                already done.
                            </li>
                            <li>
                                <strong>
                                    After you approve your design, or once
                                    production starts:
                                </strong>{" "}
                                the order can't be cancelled or changed, because
                                your approval is final and the item is being
                                made just for you.
                            </li>
                        </ul>
                    ),
                },
                {
                    id: "refunds",
                    title: "How refunds are paid",
                    content: (
                        <ul>
                            <li>
                                We refund to the original payment method where
                                possible, or to your e-wallet or bank account if
                                not.
                            </li>
                            <li>
                                We send approved refunds within 7 working days.
                                Depending on your bank or payment provider, it
                                may take a few more days to reach your account.
                            </li>
                            <li>
                                You'll see the refund recorded on your order in
                                your account.
                            </li>
                        </ul>
                    ),
                },
            ]}
        />
    );
}
