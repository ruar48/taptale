<?php

namespace App\Concerns;

trait ConvertsPesos
{
    /**
     * Convert a peso amount entered by an administrator into centavos.
     */
    protected function toCentavos(mixed $pesos): int
    {
        return (int) round(((float) $pesos) * 100);
    }
}
