import { Link } from '@inertiajs/react';
import {
    ContactInline,
    LegalPage,
    useBusiness,
} from '@/components/taptale/legal-page';
import { privacy, returns, shipping } from '@/routes/pages';

export default function Terms() {
    const business = useBusiness();
    const name = business.name;

    return (
        <LegalPage
            title="Terms of service"
            intro={
                <p>
                    These terms are the agreement between you and {name} when
                    you use our website, create an account, order a gift or use
                    a memory page. Please read them carefully. By using the
                    website or placing an order, you agree to them.
                </p>
            }
            sections={[
                {
                    id: 'about-these-terms',
                    title: '1. About these terms',
                    content: (
                        <>
                            <p>
                                "{name}", "we", "us" and "our" mean the business
                                that runs this website. "You" means the person
                                using the website or placing an order.
                            </p>
                            <p>
                                These terms work together with our{' '}
                                <Link href={privacy()}>Privacy policy</Link>,{' '}
                                <Link href={shipping()}>
                                    Shipping & delivery policy
                                </Link>{' '}
                                and{' '}
                                <Link href={returns()}>
                                    Returns & refunds policy
                                </Link>
                                .
                            </p>
                        </>
                    ),
                },
                {
                    id: 'eligibility-and-accounts',
                    title: '2. Eligibility and your account',
                    content: (
                        <>
                            <p>
                                You must be at least 18 years old to place an
                                order, or have a parent or guardian place it or
                                agree to it for you.
                            </p>
                            <ul>
                                <li>
                                    Give us accurate information and keep it up
                                    to date, especially your contact and
                                    delivery details.
                                </li>
                                <li>
                                    Keep your password private. You are
                                    responsible for activity on your account.
                                    Tell us right away if you think someone else
                                    has used it.
                                </li>
                                <li>
                                    You can delete your account at any time from
                                    your account settings.
                                </li>
                            </ul>
                        </>
                    ),
                },
                {
                    id: 'orders',
                    title: '3. Orders and personalization',
                    content: (
                        <>
                            <p>
                                When you place an order, you are offering to buy
                                the items in it. A contract is formed when we
                                confirm your payment. We may decline or cancel
                                an order before then, for example if an item is
                                unavailable or a price was shown in error. If
                                you have already paid, we will refund you in
                                full.
                            </p>
                            <h3>Content you provide</h3>
                            <p>
                                You keep ownership of the photos, text, audio
                                and links you give us. You allow us to use them
                                only to design, produce and deliver your order,
                                to show your memory page, and to give you
                                support. You confirm that:
                            </p>
                            <ul>
                                <li>
                                    you own the content or have permission to
                                    use it, including photos of other people;
                                    and
                                </li>
                                <li>
                                    it is not illegal, hateful, sexually
                                    explicit, violent or harassing, and does not
                                    infringe anyone's copyright, trademark or
                                    privacy.
                                </li>
                            </ul>
                            <p>
                                We may refuse to produce content that breaks
                                these rules. If we do, we will contact you and
                                refund any amount for work we cannot do.
                            </p>
                        </>
                    ),
                },
                {
                    id: 'prices-and-payment',
                    title: '4. Prices and payment',
                    content: (
                        <>
                            <ul>
                                <li>
                                    Prices are in Philippine pesos (₱). Your
                                    order summary shows the item price, options,
                                    any customization fee and the delivery fee
                                    before you place the order.
                                </li>
                                <li>
                                    You can pay online through our payment
                                    partner, or with one of the payment methods
                                    listed at checkout and then upload your
                                    receipt.
                                </li>
                                <li>
                                    We start work on your order only after your
                                    full payment is confirmed. Uploaded receipts
                                    are checked by our team; we may reject a
                                    payment we cannot match and ask you to send
                                    it again.
                                </li>
                                <li>
                                    We do not see or store your full card
                                    details. Online payments are handled by our
                                    payment partner.
                                </li>
                            </ul>
                        </>
                    ),
                },
                {
                    id: 'design-proofs',
                    title: '5. Design proofs and approval',
                    content: (
                        <>
                            <p>
                                When our designers prepare your gift, we send
                                you a design proof in your account. You can
                                approve it or ask for changes. Production starts
                                only after you approve.
                            </p>
                            <ul>
                                <li>
                                    Please check names, dates, spelling and
                                    photos carefully. Once you approve a proof,
                                    we produce exactly what it shows.
                                </li>
                                <li>
                                    Colors can look slightly different on screen
                                    than on the finished product, and handmade
                                    items can vary a little from piece to piece.
                                </li>
                                <li>
                                    The quality of printed photos depends on the
                                    photos you send. We will tell you if a photo
                                    looks too low in quality to print well.
                                </li>
                            </ul>
                        </>
                    ),
                },
                {
                    id: 'cancellations',
                    title: '6. Cancellations',
                    content: (
                        <>
                            <p>
                                You can cancel an order yourself from your
                                account while it is still pending or waiting for
                                payment. After that, please contact us at{' '}
                                <ContactInline />. Because every gift is made
                                for one person, we may not be able to cancel an
                                order once design work or production has
                                started. See our{' '}
                                <Link href={returns()}>
                                    Returns & refunds policy
                                </Link>{' '}
                                for details.
                            </p>
                        </>
                    ),
                },
                {
                    id: 'delivery-and-returns',
                    title: '7. Delivery, returns and refunds',
                    content: (
                        <p>
                            Delivery times and fees are explained in our{' '}
                            <Link href={shipping()}>
                                Shipping & delivery policy
                            </Link>
                            . Damaged, defective or wrong items are covered by
                            our{' '}
                            <Link href={returns()}>
                                Returns & refunds policy
                            </Link>
                            . Nothing in these terms limits your rights under
                            the Consumer Act of the Philippines (Republic Act
                            No. 7394) or other consumer laws.
                        </p>
                    ),
                },
                {
                    id: 'memory-pages',
                    title: '8. Memory pages',
                    content: (
                        <>
                            <p>
                                Some gifts come with a memory page, a web page
                                opened by tapping the gift's NFC tag or scanning
                                its QR code.
                            </p>
                            <ul>
                                <li>
                                    A memory page is not listed or searchable on
                                    our website, but{' '}
                                    <strong>
                                        anyone who has the gift, the link or the
                                        QR code can open it
                                    </strong>
                                    . Do not add information you would not want
                                    others to see.
                                </li>
                                <li>
                                    You are responsible for the content you add
                                    and can edit it from your account. We may
                                    remove content that breaks these terms or
                                    the law.
                                </li>
                                <li>
                                    We work to keep memory pages online and
                                    working, but we cannot promise they will
                                    never be interrupted. Videos and songs from
                                    other services (such as YouTube, Vimeo or
                                    Spotify) depend on those services staying
                                    available.
                                </li>
                            </ul>
                        </>
                    ),
                },
                {
                    id: 'intellectual-property',
                    title: '9. Our designs and website',
                    content: (
                        <p>
                            Our website, logo, templates, artwork and designs
                            belong to {name} or our licensors. You may use the
                            gift and designs we make for you for personal,
                            non-commercial purposes. Please do not copy, resell
                            or reproduce our templates or designs without our
                            written permission.
                        </p>
                    ),
                },
                {
                    id: 'acceptable-use',
                    title: '10. Using the website',
                    content: (
                        <>
                            <p>You agree not to:</p>
                            <ul>
                                <li>
                                    break the law or anyone's rights through the
                                    website;
                                </li>
                                <li>
                                    try to access accounts, orders or files that
                                    are not yours, or disrupt the website's
                                    security or operation; or
                                </li>
                                <li>
                                    use bots or automated tools to scrape the
                                    website or place orders.
                                </li>
                            </ul>
                            <p>
                                We may suspend or close accounts that break
                                these terms.
                            </p>
                        </>
                    ),
                },
                {
                    id: 'liability',
                    title: '11. Our responsibility to you',
                    content: (
                        <>
                            <p>
                                We take care to make your gift right and to keep
                                the website running. To the extent the law
                                allows, we are not responsible for losses we
                                could not reasonably foresee, or for delays
                                caused by events outside our control, such as
                                courier delays, natural disasters or service
                                outages.
                            </p>
                            <p>
                                To the extent the law allows, our total
                                responsibility for any order is limited to the
                                amount you paid for it. This does not limit any
                                responsibility that cannot be limited by law.
                            </p>
                        </>
                    ),
                },
                {
                    id: 'changes',
                    title: '12. Changes to these terms',
                    content: (
                        <p>
                            We may update these terms from time to time. The
                            date at the top of this page shows when they last
                            changed. Orders are covered by the terms in place
                            when you placed them.
                        </p>
                    ),
                },
                {
                    id: 'governing-law',
                    title: '13. Governing law',
                    content: (
                        <p>
                            These terms are governed by the laws of the Republic
                            of the Philippines. We would always rather settle a
                            problem with you directly, so please contact us
                            first at <ContactInline />.
                        </p>
                    ),
                },
            ]}
        />
    );
}
