<?php

namespace App\Concerns;

trait EscapesMarkdown
{
    /**
     * Make text typed by a customer or recipient safe to put in a mail line.
     *
     * Mail lines are rendered as Markdown. HTML is already escaped, but text
     * like "[Verify your account](https://evil.test)" would still become a
     * disguised link in an email that comes from Taptale. Backslash-escaping
     * Markdown punctuation shows the text exactly as it was typed.
     */
    protected function plain(?string $text): string
    {
        return addcslashes((string) $text, '\\`*_[]()#!|~');
    }
}
