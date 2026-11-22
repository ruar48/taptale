import { Check, Gift, Heart, X } from "lucide-react";
import { useState } from "react";
import type { GateKind } from "@/components/taptale/experience/config";
import {
    FloatingHearts,
    PhotoFill,
    useExperience,
    useExperienceAudio,
} from "@/components/taptale/experience/shared";
import { cn } from "@/lib/utils";

/**
 * The opening moment before the page is revealed. Opening it also starts
 * the background song (browsers require a tap before audio can play).
 */
export function Gate({
    kind,
    onOpen,
}: {
    kind: Exclude<GateKind, null>;
    onOpen: () => void;
}) {
    const { play } = useExperienceAudio();
    const [leaving, setLeaving] = useState(false);

    const open = () => {
        play();
        setLeaving(true);
        window.setTimeout(onOpen, 900);
    };

    return (
        <div
            className={cn(
                "fixed inset-0 z-50 flex items-center justify-center overflow-hidden transition-opacity duration-700",
                leaving && "pointer-events-none opacity-0",
            )}
            style={{ background: "var(--x-bg)" }}
        >
            {kind === "envelope" && (
                <EnvelopeGate opening={leaving} onOpen={open} />
            )}
            {kind === "question" && <QuestionGate onOpen={open} />}
            {kind === "tap" && <TapGate onOpen={open} />}
        </div>
    );
}

function EnvelopeGate({
    opening,
    onOpen,
}: {
    opening: boolean;
    onOpen: () => void;
}) {
    const { experience, preset, photoAt } = useExperience();
    const backdrop = photoAt(0);

    return (
        <>
            {backdrop && (
                <div className="absolute inset-0">
                    <PhotoFill
                        src={backdrop}
                        className="size-full scale-110 blur-[2px]"
                    />
                    <div className="absolute inset-0 bg-black/40" />
                </div>
            )}
            <FloatingHearts count={8} />
            <div className="relative flex flex-col items-center px-6 text-center">
                <p className="font-script text-5xl text-white drop-shadow-[0_2px_10px_rgb(0_0_0/0.4)] sm:text-7xl">
                    {preset.labels?.gate ?? "You've got mail!"}
                </p>
                {experience.recipient_name && (
                    <p className="mt-2 text-sm tracking-[0.3em] text-white/85 uppercase">
                        For {experience.recipient_name}
                    </p>
                )}
                <button
                    type="button"
                    onClick={onOpen}
                    className="group relative mt-10 h-48 w-72 [perspective:900px] sm:h-56 sm:w-80"
                    aria-label="Open the envelope"
                >
                    <span className="absolute inset-0 rounded-md bg-[#A3151D] shadow-[0_30px_60px_-20px_rgb(0_0_0/0.6)]" />
                    <span className="absolute inset-x-0 bottom-0 h-full rounded-md bg-[linear-gradient(155deg,transparent_49.5%,#8C1118_50%),linear-gradient(205deg,transparent_49.5%,#951219_50%)]" />
                    <span
                        className={cn(
                            "absolute inset-x-0 top-0 h-[58%] origin-top transition-transform duration-700 [clip-path:polygon(0_0,100%_0,50%_100%)]",
                            opening ? "[transform:rotateX(180deg)]" : "",
                        )}
                        style={{
                            background:
                                "linear-gradient(180deg, #C21F28, #A3151D)",
                        }}
                    />
                    <span className="absolute top-[46%] left-1/2 flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[radial-gradient(circle_at_35%_30%,#F3D98B,#C9A043_60%,#8E6B22)] shadow-[0_4px_10px_rgb(0_0_0/0.4)] transition-transform group-hover:scale-110">
                        <Heart
                            className="size-6 text-[#8E6B22]"
                            fill="currentColor"
                        />
                    </span>
                </button>
                <p className="mt-6 animate-pulse text-sm text-white/90">
                    {preset.labels?.gateHint ?? "Click the wax to open"}
                </p>
            </div>
        </>
    );
}

function QuestionGate({ onOpen }: { onOpen: () => void }) {
    const { experience, preset } = useExperience();
    const [dodges, setDodges] = useState(0);
    const [offset, setOffset] = useState({ x: 0, y: 0 });

    const dodge = () => {
        setDodges((count) => count + 1);
        setOffset({
            x: (Math.random() - 0.5) * 220,
            y: (Math.random() - 0.5) * 160,
        });
    };

    const noLabels = [
        "No",
        "Are you sure?",
        "Really?",
        "Think again 🥺",
        "Pretty please?",
        "Okay fine…",
    ];

    return (
        <div className="relative mx-5 w-full max-w-md rounded-[2rem] bg-white/95 p-8 text-center text-[#3A2A30] shadow-[0_30px_80px_-30px_rgb(0_0_0/0.6)]">
            <div className="mx-auto flex size-24 animate-wiggle items-center justify-center rounded-full bg-[#FBE3E8]">
                <Heart className="size-12 text-[#D04A6B]" fill="currentColor" />
            </div>
            <h1 className="mt-6 font-display text-4xl font-semibold text-[#8B1A22] uppercase">
                {experience.title}
            </h1>
            <p className="mt-2 text-sm tracking-[0.15em] text-[#8B1A22]/80 uppercase">
                {preset.labels?.question ??
                    experience.subtitle ??
                    "Would you like to see your gift?"}
            </p>
            <div className="relative mt-8 flex h-20 items-center justify-center gap-6">
                <button
                    type="button"
                    onMouseEnter={dodges < 5 ? dodge : undefined}
                    onClick={dodges < 5 ? dodge : onOpen}
                    className="flex size-16 items-center justify-center rounded-full bg-[#8B1A22] text-white shadow-lg transition-transform duration-300"
                    style={{
                        transform: `translate(${offset.x}px, ${offset.y}px) scale(${Math.max(0.55, 1 - dodges * 0.08)})`,
                    }}
                    aria-label={noLabels[Math.min(dodges, noLabels.length - 1)]}
                >
                    <X className="size-8" strokeWidth={3} />
                </button>
                <button
                    type="button"
                    onClick={onOpen}
                    className="flex items-center justify-center rounded-full bg-[#8B1A22] text-white shadow-lg transition-transform hover:scale-110"
                    style={{
                        width: `${64 + dodges * 6}px`,
                        height: `${64 + dodges * 6}px`,
                    }}
                    aria-label="Yes, show me"
                >
                    <Check className="size-8" strokeWidth={3} />
                </button>
            </div>
            <p className="mt-4 h-5 text-xs text-[#8B1A22]/70">
                {dodges > 0
                    ? noLabels[Math.min(dodges, noLabels.length - 1)]
                    : " "}
            </p>
        </div>
    );
}

function TapGate({ onOpen }: { onOpen: () => void }) {
    const { experience, preset } = useExperience();

    return (
        <>
            <FloatingHearts count={14} />
            <div className="relative flex flex-col items-center px-6 text-center">
                <p className="font-script text-5xl leading-tight sm:text-7xl">
                    {preset.labels?.gate ?? experience.title}
                </p>
                {experience.subtitle && (
                    <p className="mt-3 font-display text-lg text-[var(--x-muted)]">
                        {experience.subtitle}
                    </p>
                )}
                <button
                    type="button"
                    onClick={onOpen}
                    className="group mt-10 flex flex-col items-center"
                    aria-label="Tap to open"
                >
                    <span className="relative flex size-36 animate-float items-center justify-center rounded-full bg-[var(--x-accent)] text-[var(--x-accent-ink)] shadow-[0_24px_50px_-18px_rgb(0_0_0/0.55)] transition-transform group-hover:scale-110">
                        <span className="absolute inset-0 animate-ping rounded-full bg-[var(--x-accent)] opacity-25" />
                        <Gift className="size-16" strokeWidth={1.5} />
                    </span>
                    <span className="mt-6 font-display text-lg underline underline-offset-4">
                        Tap here
                    </span>
                </button>
                {experience.recipient_name && (
                    <p className="mt-4 text-xs tracking-[0.3em] text-[var(--x-muted)] uppercase">
                        For {experience.recipient_name}
                    </p>
                )}
            </div>
        </>
    );
}
