import { Link } from '@inertiajs/react';
import { LegalPage, useBusiness } from '@/components/taptale/legal-page';
import { privacy } from '@/routes/pages';

const COOKIES = [
    {
        name: 'Session cookie (ends in "-session")',
        purpose:
            'Keeps you signed in and remembers your progress as you move between pages.',
        type: 'Strictly necessary',
        duration: 'Up to 2 hours of inactivity',
    },
    {
        name: 'XSRF-TOKEN',
        purpose:
            'Protects your account by making sure forms are sent from our website and not from someone else.',
        type: 'Strictly necessary',
        duration: 'Same as the session',
    },
    {
        name: 'remember_web_…',
        purpose:
            'Keeps you signed in on this device, only if you tick "Remember me".',
        type: 'Strictly necessary',
        duration: 'Until you log out',
    },
    {
        name: 'appearance',
        purpose: 'Remembers whether you chose light, dark or system mode.',
        type: 'Preference',
        duration: '1 year',
    },
    {
        name: 'sidebar_state',
        purpose:
            'Remembers whether the menu in your account area is open or closed.',
        type: 'Preference',
        duration: '7 days',
    },
];

export default function Cookies() {
    const business = useBusiness();

    return (
        <LegalPage
            title="Cookie policy"
            intro={
                <p>
                    Cookies are small text files a website saves in your
                    browser. {business.name} uses only the few cookies needed to
                    run the shop and remember your settings.{' '}
                    <strong>
                        We do not use advertising or tracking cookies.
                    </strong>
                </p>
            }
            sections={[
                {
                    id: 'cookies-we-use',
                    title: 'Cookies we use',
                    content: (
                        <>
                            <div className="overflow-x-auto rounded-2xl border border-plum/10 dark:border-border">
                                <table className="w-full min-w-[36rem] text-left text-sm">
                                    <thead className="bg-plum/5 text-xs tracking-wide uppercase">
                                        <tr>
                                            <th className="px-4 py-3">
                                                Cookie
                                            </th>
                                            <th className="px-4 py-3">
                                                What it does
                                            </th>
                                            <th className="px-4 py-3">Type</th>
                                            <th className="px-4 py-3">
                                                How long
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-plum/10 dark:divide-border">
                                        {COOKIES.map((cookie) => (
                                            <tr key={cookie.name}>
                                                <td className="px-4 py-3 font-mono text-xs">
                                                    {cookie.name}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {cookie.purpose}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    {cookie.type}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {cookie.duration}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <p>
                                We also save one small setting in your browser's
                                local storage to remember that you have closed
                                our cookie notice, so it doesn't show again.
                            </p>
                        </>
                    ),
                },
                {
                    id: 'third-parties',
                    title: 'Cookies from other services',
                    content: (
                        <ul>
                            <li>
                                <strong>Online payments.</strong> When you pay
                                online, you go to our payment partner's secure
                                checkout page, which may set its own cookies to
                                process the payment and prevent fraud.
                            </li>
                            <li>
                                <strong>
                                    Songs and videos on memory pages.
                                </strong>{' '}
                                If a memory page includes a YouTube, Vimeo or
                                Spotify player, that service may set cookies
                                when the player loads or plays. We use YouTube's
                                privacy-enhanced mode where we can.
                            </li>
                        </ul>
                    ),
                },
                {
                    id: 'your-choices',
                    title: 'Your choices',
                    content: (
                        <>
                            <p>
                                Because we only use cookies the website needs to
                                work or that remember your own settings, we
                                don't ask you to accept them one by one. You can
                                still block or delete cookies in your browser
                                settings at any time. If you block the strictly
                                necessary ones, you won't be able to sign in or
                                place an order.
                            </p>
                            <p>
                                If we ever add analytics or marketing cookies,
                                we will update this page and ask for your
                                consent first.
                            </p>
                            <p>
                                For more on how we handle your information, see
                                our <Link href={privacy()}>Privacy policy</Link>
                                .
                            </p>
                        </>
                    ),
                },
            ]}
        />
    );
}
