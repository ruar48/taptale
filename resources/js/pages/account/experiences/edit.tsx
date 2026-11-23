import { Head, setLayoutProps } from "@inertiajs/react";
import {
    ExperienceEditor,
    type ExperienceEditorProps,
} from "@/components/taptale/experience/experience-editor";
import { edit } from "@/routes/account/experiences";
import {
    index as ordersIndex,
    show as orderShow,
} from "@/routes/account/orders";
import {
    index as adminOrdersIndex,
    show as adminOrderShow,
} from "@/routes/admin/orders";

export default function EditExperience(props: ExperienceEditorProps) {
    const { experience, order, adminEditing } = props;

    setLayoutProps({
        breadcrumbs: adminEditing
            ? [
                  { title: "Orders", href: adminOrdersIndex() },
                  {
                      title: order.reference,
                      href: adminOrderShow(order.reference),
                  },
                  { title: "Memory page", href: edit(experience.code) },
              ]
            : [
                  { title: "My orders", href: ordersIndex() },
                  { title: order.reference, href: orderShow(order.reference) },
                  { title: "Memory page", href: edit(experience.code) },
              ],
    });

    return (
        <>
            <Head title={adminEditing ? "Memory Page" : "My Memory Page"} />
            <ExperienceEditor {...props} />
        </>
    );
}
