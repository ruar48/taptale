import { Link } from "@inertiajs/react";
import {
    ContactInline,
    LegalPage,
    useBusiness,
} from "@/components/taptale/legal-page";
import { privacy, returns, shipping } from "@/routes/pages";

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
                    id: "about-these-terms",
                    title: "1. About these terms",
                    content: (
                        <>
                            <p>
                                "{name}", "we", "us" and "our" mean the business
                                that runs this website. "You" means the person
                                using the website or placing an order.
                            </p>
                            <p>
                                These terms work together with our{" "}
                                <Link href={privacy()}>Privacy policy</Link>,{" "}
                                <Link href={shipping()}>
                                    Shipping & delivery policy
                                </Link>{" "}
                                and{" "}
                                <Link href={returns()}>
                                    Returns & refunds policy
                                </Link>
                                .
                            </p>
                        </>
                    ),
                },
                {
                    id: "eligibility-and-accounts",
                    title: "2. Eligibility and your account",
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
                    id: "orders",
                    title: "3. Orders and personalization",
                    content: (
                        <>
                            <p>
                                When you place an order, you are offering to buy
                                the items in it. A contract is formed when we
                                confirm your payment or, for cash on delivery,
                                when we confirm your order. We may decline or
                                cancel an order before then, for example if an
                                item is unavailable or a price was shown in
                                error. If you have already paid, we will refund
                                you in full.
                            </p>
                            <ul>
                                <li>
                                    You need to confirm your email address
                                    before you can place an order.
                                </li>
                                <li>
                                    To keep our queue fair, we limit how many
                                    unpaid orders one account can have open and
                                    how many orders it can place in a day.
                                </li>
                                <li>
                                    An order that stays unpaid for 14 days is
                                    cancelled automatically, and the photos and
                                    files uploaded for it are deleted.
                                </li>
                                <li>
                                    Promo codes follow the conditions shown with
                                    them, such as a minimum spend, an end date
                                    or a limited number of uses. A code used on
                                    an order you cancel can be used again.
                                </li>
                            </ul>
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
                    id: "prices-and-payment",
                    title: "4. Prices and payment",
                    content: (
                        <>
                            <ul>
                                <li>
                                    Prices are in Philippine pesos (₱). Your
                                    order summary shows the item price, options,
                                    any customization or add-on fee (such as
                                    flowers for your memory page), any promo
                                    discount and the delivery fee before you
                                    place the order.
                                </li>
                                <li>
                                    You can pay with QR Ph through our payment
                                    partner, or choose cash on delivery at
                                    checkout where it is offered.
                                </li>
                                <li>
                                    <strong>QR Ph:</strong> we start work on
                                    your order once your payment is confirmed by
                                    our payment partner.
                                </li>
                                <li>
                                    <strong>Cash on delivery:</strong> we start
                                    work right after you order. Please pay the
                                    exact amount shown on your order to the
                                    courier when your gift arrives. Because
                                    every gift is made just for you, please
                                    choose cash on delivery only if you are sure
                                    you will accept the parcel.
                                </li>
                                <li>
                                    We do not see or store your bank, card or
                                    e-wallet login details. Online payments are
                                    handled by our payment partner.
                                </li>
                            </ul>
                        </>
                    ),
                },
                {
                    id: "design-proofs",
                    title: "5. Finishing and approving your design",
                    content: (
                        <>
                            <p>
                                After you order, you finish your design from
                                your order page. We do not make anything until
                                your design is complete and approved. You can
                                finish it in one of two ways:
                            </p>
                            <ul>
                                <li>
                                    <strong>Customize it yourself.</strong> Add
                                    your photos, names, date, song and message
                                    to the template you chose, check the live
                                    preview, and approve it. You can save and
                                    come back as often as you like before you
                                    approve.
                                </li>
                                <li>
                                    <strong>Send it to us.</strong> Send your
                                    photos and details (and a short description
                                    if our designers are creating your design).
                                    We put your design together and send you a
                                    design proof in your account. You can
                                    approve it or ask for changes. Once sent,
                                    your details can no longer be edited from
                                    your order page; ask for changes on the
                                    proof instead.
                                </li>
                            </ul>
                            <h3>Approval is final</h3>
                            <ul>
                                <li>
                                    <strong>
                                        Once you approve a design, whether your
                                        own live preview or a proof from us, it
                                        is final and cannot be changed or
                                        undone.
                                    </strong>{" "}
                                    We produce exactly what it shows, and you
                                    can no longer add or replace photos or files
                                    for it.
                                </li>
                                <li>
                                    Please check names, dates, spelling and
                                    photos carefully before you approve.
                                    Mistakes in a design you approved are not
                                    covered by our{" "}
                                    <Link href={returns()}>
                                        Returns & refunds policy
                                    </Link>
                                    .
                                </li>
                                <li>
                                    Approval covers your physical keepsake. If
                                    your gift has a memory page, you can keep
                                    editing its content from your account (see
                                    section 8).
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
                    id: "cancellations",
                    title: "6. Cancellations",
                    content: (
                        <>
                            <p>
                                You can cancel an order yourself from your
                                account while it is still pending or waiting for
                                payment and nothing has been paid. Cash on
                                delivery orders go straight to design, so please
                                contact us at <ContactInline /> to cancel one.
                                Because every gift is made for one person, we
                                may not be able to cancel an order once design
                                work has started, and{" "}
                                <strong>
                                    an order cannot be cancelled after you
                                    approve its design
                                </strong>
                                . See our{" "}
                                <Link href={returns()}>
                                    Returns & refunds policy
                                </Link>{" "}
                                for details.
                            </p>
                        </>
                    ),
                },
                {
                    id: "delivery-and-returns",
                    title: "7. Delivery, returns and refunds",
                    content: (
                        <p>
                            Delivery times and fees are explained in our{" "}
                            <Link href={shipping()}>
                                Shipping & delivery policy
                            </Link>
                            . Damaged, defective or wrong items are covered by
                            our{" "}
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
                    id: "memory-pages",
                    title: "8. Memory pages",
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
                                    our website and opens only through the
                                    private link on the gift's tag or QR code.
                                    Even so,{" "}
                                    <strong>
                                        anyone who has the gift, the link or the
                                        QR code can open it
                                    </strong>
                                    . Do not add information you would not want
                                    others to see.
                                </li>
                                <li>
                                    You are responsible for the content you add,
                                    including photos, videos, songs and
                                    messages, and can edit it from your account.
                                    You can switch the page's design until your
                                    keepsake ships; after that, the design stays
                                    as it is but you can still edit the content.
                                    We may remove content that breaks these
                                    terms or the law.
                                </li>
                                <li>
                                    Visitors can leave hearts and replies on a
                                    memory page. You can see them in your
                                    account.
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
                    id: "intellectual-property",
                    title: "9. Our designs and website",
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
                    id: "acceptable-use",
                    title: "10. Using the website",
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
                    id: "liability",
                    title: "11. Our responsibility to you",
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
                    id: "changes",
                    title: "12. Changes to these terms",
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
                    id: "governing-law",
                    title: "13. Governing law",
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
