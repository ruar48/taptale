export type DesignMode = 'self' | 'assisted';

export const WIZARD_STEPS = [
    {
        key: 'product',
        title: 'Gift',
        description: 'Choose your keepsake & design',
    },
    {
        key: 'website',
        title: 'Website',
        description: 'Pick your tap page design',
    },
    {
        key: 'customize',
        title: 'Personalize',
        description: 'Add your story (optional)',
    },
    { key: 'specs', title: 'Details', description: 'Size, finish & quantity' },
    { key: 'checkout', title: 'Checkout', description: 'Delivery & payment' },
] as const;

export type WizardStep = (typeof WIZARD_STEPS)[number];

export type WizardStepKey = WizardStep['key'];

/**
 * The steps for a gift. The website step only applies to gifts that can
 * open a tap / QR memory page.
 */
export function stepsFor(hasTapPage: boolean): WizardStep[] {
    return WIZARD_STEPS.filter((step) => hasTapPage || step.key !== 'website');
}
