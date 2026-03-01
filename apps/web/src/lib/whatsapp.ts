// src/lib/whatsapp.ts
// ─────────────────────────────────────────────────────────────────
// WhatsApp Utility for Khan Hub
// Generates wa.me links with pre-filled messages.
// ─────────────────────────────────────────────────────────────────

import { SITE } from '@/data/site';

/**
 * Generates a WhatsApp URL with a pre-filled message.
 * @param data - The form data to include in the message.
 * @param subject - The subject or context of the message.
 * @returns A string representing the WhatsApp URL.
 */
export function getWhatsAppUrl(data: Record<string, string | number | undefined>, subject: string): string {
    const phoneNumber = '923006395220'; // Khan Hub WhatsApp (wa.me uses 92 format)

    let body = `*${subject}*\n\n`;

    Object.entries(data).forEach(([key, value]) => {
        if (value) {
            // Capitalize key for better readability
            const label = key.charAt(0).toUpperCase() + key.slice(1);
            body += `*${label}:* ${value}\n`;
        }
    });

    body += `\nSent via Khan Hub Website`;

    const encodedMessage = encodeURIComponent(body);
    return `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
}
