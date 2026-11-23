import { Link } from '@inertiajs/react';
import {
    ContactDetails,
    LegalPage,
    useBusiness,
} from '@/components/taptale/legal-page';
import { index as categoriesIndex } from '@/routes/categories';
import { templates as memoryPages } from '@/routes/experiences';
import { create as startOrder } from '@/routes/orders';

export default function About() {
    const business = useBusiness();

    return (
        <LegalPage
            title="Who we are"
            eyebrow="About us"
            showUpdatedOn={false}
            intro={
                <p>
                    {business.name} is a small gift studio in the Philippines.
                    We make personalized keepsakes that join something you can
                    hold with the memories you never want to lose. Every tap
                    tells a story.
                </p>
            }
            sections={[
                {
                    id: 'our-story',
                    title: 'Our story',
                    content: (
                        <>
                            <p>
                                The best gifts aren't the most expensive ones.
                                They're the ones that say "I remember." We
                                started {business.name} to make that kind of
                                gift easy: a keychain, frame or tag made just
                                for one person, carrying photos, songs and words
                                that matter to them.
                            </p>
                            <p>
                                Many of our pieces have an NFC tag or QR code.
                                Tap it with a phone and it opens a{' '}
                                <Link href={memoryPages()}>memory page</Link>: a
                                small private website with your photos, message,
                                song or video. The gift lasts, and so does the
                                story behind it.
                            </p>
                        </>
                    ),
                },
                {
                    id: 'what-we-make',
                    title: 'What we make',
                    content: (
                        <>
                            <p>
                                Our designers make personalized gifts for
                                birthdays, anniversaries, graduations, weddings
                                and the everyday moments in between:
                            </p>
                            <ul>
                                <li>
                                    Acrylic, wood and photo keepsakes, printed
                                    with your photos, names and dates.
                                </li>
                                <li>
                                    NFC and QR gifts that open a memory page
                                    when tapped or scanned.
                                </li>
                                <li>
                                    Gift packaging and add-ons to make the
                                    unboxing feel special.
                                </li>
                            </ul>
                            <p>
                                <Link href={categoriesIndex()}>
                                    Browse gifts by occasion
                                </Link>{' '}
                                to see everything we make.
                            </p>
                        </>
                    ),
                },
                {
                    id: 'how-it-works',
                    title: 'How it works',
                    content: (
                        <ol>
                            <li>
                                <strong>Personalize.</strong> Choose a gift, then
                                add your photos, names and message. You can also ask our designers to do it
                                for you.
                            </li>
                            <li>
                                <strong>Pay securely.</strong> Pay online, or
                                with one of our listed payment methods and
                                upload your receipt for our team to confirm.
                            </li>
                            <li>
                                <strong>Approve your design.</strong> When a
                                designer prepares your gift, you get a proof to
                                approve or ask changes on. Nothing is produced
                                until you're happy.
                            </li>
                            <li>
                                <strong>We make and ship it.</strong> Your gift
                                is made by hand and delivered to your door, with
                                tracking in your account.
                            </li>
                        </ol>
                    ),
                },
                {
                    id: 'our-promise',
                    title: 'Our promise',
                    content: (
                        <ul>
                            <li>
                                <strong>Made by people, with care.</strong> Real
                                designers check every order before it goes into
                                production.
                            </li>
                            <li>
                                <strong>Your memories stay yours.</strong> Your
                                photos and messages are used only to make your
                                gift. We never sell your information.
                            </li>
                            <li>
                                <strong>We make it right.</strong> If your gift
                                arrives damaged or isn't what you approved,
                                we'll replace it or refund you.
                            </li>
                        </ul>
                    ),
                },
                {
                    id: 'contact',
                    title: 'Get in touch',
                    content: (
                        <>
                            <p>
                                Have a question, a custom idea or a bulk order
                                for an event? We'd love to hear from you.
                            </p>
                            <ContactDetails />
                            <p>
                                Ready to make something?{' '}
                                <Link href={startOrder()}>Start creating</Link>.
                            </p>
                        </>
                    ),
                },
            ]}
        />
    );
}
