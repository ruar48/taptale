import { Link } from '@inertiajs/react';
import {
    ContactDetails,
    ContactInline,
    LegalPage,
    useBusiness,
} from '@/components/taptale/legal-page';
import { cookies } from '@/routes/pages';

export default function Privacy() {
    const business = useBusiness();
    const name = business.name;

    return (
        <LegalPage
            title="Privacy policy"
            intro={
                <p>
                    Your photos, messages and memories are personal. This policy
                    explains what information {name} collects, why we need it,
                    who we share it with and the choices you have. We follow the
                    Data Privacy Act of 2012 (Republic Act No. 10173) and its
                    implementing rules.
                </p>
            }
            sections={[
                {
                    id: 'who-we-are',
                    title: '1. Who we are',
                    content: (
                        <>
                            <p>
                                {name} runs this website and decides how your
                                personal information is used (we are the
                                "personal information controller"). For any
                                privacy question or request, including questions
                                for our data protection officer, contact us:
                            </p>
                            <ContactDetails />
                        </>
                    ),
                },
                {
                    id: 'what-we-collect',
                    title: '2. Information we collect',
                    content: (
                        <>
                            <h3>Information you give us</h3>
                            <ul>
                                <li>
                                    <strong>Account details:</strong> your name,
                                    email address and password (stored
                                    encrypted; we never see it).
                                </li>
                                <li>
                                    <strong>Order and delivery details:</strong>{' '}
                                    the recipient's name, phone number, delivery
                                    address and any notes you add.
                                </li>
                                <li>
                                    <strong>Personalization content:</strong>{' '}
                                    photos, names, dates, messages, voice or
                                    audio recordings and song or video links you
                                    add to your gift or memory page. These may
                                    include information about other people, such
                                    as the gift recipient.
                                </li>
                                <li>
                                    <strong>Payment details:</strong> the
                                    payment method you chose, reference numbers
                                    and receipt screenshots you upload. Online
                                    payments are handled by our payment partner;
                                    we never receive your full card number.
                                </li>
                                <li>
                                    <strong>Messages:</strong> design feedback,
                                    revision requests and anything you send us
                                    for support.
                                </li>
                            </ul>
                            <h3>Information collected automatically</h3>
                            <ul>
                                <li>
                                    Technical information such as your IP
                                    address, browser type, device and the pages
                                    you visit, kept in our server logs for
                                    security and troubleshooting.
                                </li>
                                <li>
                                    Cookies needed to keep you signed in and
                                    protect forms. See our{' '}
                                    <Link href={cookies()}>Cookie policy</Link>.
                                </li>
                            </ul>
                        </>
                    ),
                },
                {
                    id: 'how-we-use',
                    title: '3. How we use your information',
                    content: (
                        <>
                            <p>We use your information to:</p>
                            <ul>
                                <li>
                                    create and manage your account and orders;
                                </li>
                                <li>
                                    design, produce and deliver your gift, and
                                    show your memory page;
                                </li>
                                <li>confirm payments and issue refunds;</li>
                                <li>
                                    send you order updates, design proofs and
                                    replies to your messages;
                                </li>
                                <li>
                                    keep the website secure and prevent fraud
                                    and abuse; and
                                </li>
                                <li>
                                    meet our legal, tax and accounting
                                    obligations.
                                </li>
                            </ul>
                            <p>
                                We process your information because it is needed
                                to fulfil our agreement with you, because the
                                law requires it, because of our legitimate
                                interest in running a safe and working shop, or
                                because you gave your consent.{' '}
                                <strong>
                                    We do not sell your personal information,
                                    and we do not use your photos or messages
                                    for advertising
                                </strong>{' '}
                                unless you clearly allow us to.
                            </p>
                        </>
                    ),
                },
                {
                    id: 'sharing',
                    title: '4. Who we share it with',
                    content: (
                        <>
                            <p>
                                We share only what each party needs to do its
                                job:
                            </p>
                            <ul>
                                <li>
                                    <strong>Couriers</strong> receive the
                                    recipient's name, phone number and address
                                    to deliver your order.
                                </li>
                                <li>
                                    <strong>Payment partners</strong> (such as
                                    PayMongo) process online payments under
                                    their own privacy policies.
                                </li>
                                <li>
                                    <strong>Service providers</strong> that host
                                    our website, store files and send email for
                                    us. They may only use your information to
                                    provide their service to us.
                                </li>
                                <li>
                                    <strong>Embedded media services</strong>{' '}
                                    (YouTube, Vimeo or Spotify) load only when a
                                    memory page includes a song or video from
                                    them.
                                </li>
                                <li>
                                    <strong>Government authorities</strong>,
                                    when the law or a valid legal order requires
                                    it.
                                </li>
                            </ul>
                            <p>
                                Some of these providers may store information
                                outside the Philippines. When that happens, we
                                take steps to make sure it stays protected as
                                the Data Privacy Act requires.
                            </p>
                        </>
                    ),
                },
                {
                    id: 'memory-pages',
                    title: '5. Memory pages',
                    content: (
                        <p>
                            Memory pages are not listed or searchable on our
                            website and each one has a hard-to-guess address.
                            However,{' '}
                            <strong>
                                anyone with the gift, link or QR code can view
                                it
                            </strong>
                            . Only add photos and details you are comfortable
                            sharing with whoever holds the gift, and get
                            permission before adding photos of other people. You
                            can change or remove the content at any time from
                            your account.
                        </p>
                    ),
                },
                {
                    id: 'retention',
                    title: '6. How long we keep it',
                    content: (
                        <ul>
                            <li>
                                Account details are kept until you delete your
                                account.
                            </li>
                            <li>
                                Order, payment and invoice records are kept for
                                as long as Philippine tax and accounting laws
                                require, even after an account is deleted.
                            </li>
                            <li>
                                Photos and files for your order are kept while
                                we need them to make, support and reprint your
                                gift, and while your memory page is active. You
                                can ask us to delete them sooner.
                            </li>
                            <li>
                                Server logs are kept for a short period for
                                security, then deleted.
                            </li>
                        </ul>
                    ),
                },
                {
                    id: 'security',
                    title: '7. How we protect it',
                    content: (
                        <p>
                            We use encrypted (HTTPS) connections, store
                            passwords encrypted, keep your uploaded photos and
                            receipts in private storage, and limit access to the
                            team members who need it to fulfil your order. You
                            can also turn on two-factor authentication in your
                            account settings. No system is perfectly secure, but
                            if a breach affects your information, we will notify
                            you and the National Privacy Commission as the law
                            requires.
                        </p>
                    ),
                },
                {
                    id: 'your-rights',
                    title: '8. Your rights',
                    content: (
                        <>
                            <p>
                                Under the Data Privacy Act, you have the right
                                to:
                            </p>
                            <ul>
                                <li>
                                    be informed about how your information is
                                    used;
                                </li>
                                <li>
                                    access your information and get a copy of
                                    it;
                                </li>
                                <li>correct inaccurate information;</li>
                                <li>
                                    object to processing, or withdraw consent
                                    you gave;
                                </li>
                                <li>
                                    have your information erased or blocked,
                                    where the law allows;
                                </li>
                                <li>
                                    receive your information in a portable
                                    format; and
                                </li>
                                <li>
                                    file a complaint with the National Privacy
                                    Commission (privacy.gov.ph) and claim
                                    damages.
                                </li>
                            </ul>
                            <p>
                                You can update your profile or delete your
                                account yourself from your account settings. For
                                anything else, email us at <ContactInline />. We
                                may need to confirm your identity before acting
                                on a request.
                            </p>
                        </>
                    ),
                },
                {
                    id: 'children',
                    title: '9. Children',
                    content: (
                        <p>
                            Our website is meant for adults. We do not knowingly
                            create accounts for children under 18 without a
                            parent's or guardian's consent. If you add photos of
                            a child to a gift or memory page, please make sure
                            you are their parent or guardian or have that
                            person's permission.
                        </p>
                    ),
                },
                {
                    id: 'changes',
                    title: '10. Changes to this policy',
                    content: (
                        <p>
                            We may update this policy as our services or the law
                            change. The date at the top shows the latest
                            version. If a change is significant, we will let you
                            know by email or on the website.
                        </p>
                    ),
                },
            ]}
        />
    );
}
