import { Head } from "@inertiajs/react";
import {
    ExperienceEditor,
    type ExperienceEditorProps,
} from "@/components/taptale/experience/experience-editor";

/**
 * The private link the studio sends a customer to fill in the website their
 * keychain opens, with their photos and words. No account needed.
 */
export default function WebsiteEdit(props: ExperienceEditorProps) {
    return (
        <>
            <Head title="Your website" />
            <div className="mx-auto w-full max-w-6xl p-4 sm:p-6">
                <ExperienceEditor {...props} embedded />
            </div>
        </>
    );
}
