import { Head, Link } from '@inertiajs/react';
import { Eye, Sparkles, X } from 'lucide-react';
import { useState } from 'react';
import {
    presetFor,
    themeFor,
    themeStyle,
} from '@/components/taptale/experience/config';
import { Gate } from '@/components/taptale/experience/gates';
import { ExperienceSection } from '@/components/taptale/experience/sections';
import {
    AudioProvider,
    ExperienceContext,
    MusicButton,
} from '@/components/taptale/experience/shared';
import { home } from '@/routes';
import { templates as memoryPages } from '@/routes/experiences';
import { create as startOrder } from '@/routes/orders';
import type { DigitalExperience } from '@/types';

export default function Experience({
    experience,
    isPreview,
    isDemo = false,
}: {
    experience: DigitalExperience;
    isPreview: boolean;
    isDemo?: boolean;
}) {
    const theme = themeFor(experience.theme);
    const preset = presetFor(experience.template);
    const [opened, setOpened] = useState(
        () =>
            preset.gate === null ||
            (typeof window !== 'undefined' &&
                new URLSearchParams(window.location.search).get('intro') === '0'),
    );
    const [lightbox, setLightbox] = useState<string | null>(null);

    const photos = experience.photos.map((photo) => photo.url);
    const photoAt = (index: number): string | null =>
        photos.length > 0 ? photos[index % photos.length] : null;

    return (
        <ExperienceContext.Provider
            value={{
                experience,
                preset,
                theme,
                photos,
                photoAt,
                moments: experience.moments,
                openPhoto: setLightbox,
            }}
        >
            <AudioProvider src={experience.audio_url}>
                <Head title={experience.title} />
                <div
                    className="min-h-screen overflow-x-hidden"
                    style={themeStyle(theme)}
                >
                    {(isPreview || isDemo) && (
                        <div className="sticky top-0 z-40 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-amber-100 px-4 py-2 text-center text-sm text-amber-900">
                            {isDemo ? (
                                <>
                                    <Sparkles className="size-4" /> Demo of the
                                    “{experience.title}” design with sample
                                    words.
                                    <Link
                                        href={memoryPages()}
                                        className="font-semibold underline underline-offset-2"
                                    >
                                        More designs
                                    </Link>
                                    <Link
                                        href={startOrder()}
                                        className="font-semibold underline underline-offset-2"
                                    >
                                        Create yours
                                    </Link>
                                </>
                            ) : (
                                <>
                                    <Eye className="size-4" /> Preview — only
                                    you can see this page until you publish it.
                                </>
                            )}
                        </div>
                    )}

                    {!opened && preset.gate && (
                        <Gate
                            kind={preset.gate}
                            onOpen={() => setOpened(true)}
                        />
                    )}

                    <main>
                        {preset.sections.map((section) => (
                            <ExperienceSection
                                key={section}
                                section={section}
                            />
                        ))}
                    </main>

                    <footer className="pb-24 text-center text-xs opacity-70">
                        <Link href={home()} className="hover:underline">
                            Made with Taptale · Every tap tells a story
                        </Link>
                    </footer>

                    <MusicButton />

                    {lightbox && (
                        <div
                            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
                            onClick={() => setLightbox(null)}
                        >
                            <button
                                type="button"
                                className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white"
                                aria-label="Close photo"
                            >
                                <X className="size-6" />
                            </button>
                            <img
                                src={lightbox}
                                alt=""
                                className="max-h-full max-w-full rounded-xl"
                            />
                        </div>
                    )}
                </div>
            </AudioProvider>
        </ExperienceContext.Provider>
    );
}
