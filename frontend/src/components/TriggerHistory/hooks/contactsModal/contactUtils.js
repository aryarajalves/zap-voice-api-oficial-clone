/**
 * Utilitários para extração e tratamento de contatos nos modais de disparo.
 */

export const getContactPhone = (contact) => {
    if (!contact) return '';
    if (typeof contact === 'string') return contact;
    return (
        contact.phone_number ||
        contact.phone ||
        contact.whatsapp ||
        contact.telefone ||
        contact.contact_phone ||
        contact.number ||
        contact.meta?.sender?.phone_number ||
        ''
    );
};
