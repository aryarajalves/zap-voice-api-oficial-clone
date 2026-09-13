import { getFakeContactData } from '../common';

export function generateKirvanoPayload(eventType, index) {
    const { i, name, email, phone, ts } = getFakeContactData(index);
    const isOB = eventType === 'SALE_APPROVED_OB';
    const kirEventType = isOB ? 'SALE_APPROVED' : eventType;
    const isSubscription = ['SUBSCRIPTION_CANCELED', 'SUBSCRIPTION_EXPIRED', 'SUBSCRIPTION_RENEWED'].includes(kirEventType);
    const isBankSlip = ['BANK_SLIP_GENERATED', 'BANK_SLIP_EXPIRED'].includes(kirEventType);
    const isPix = ['PIX_GENERATED', 'PIX_EXPIRED'].includes(kirEventType);
    const isAbandoned = kirEventType === 'ABANDONED_CART';

    const base = {
        event: kirEventType,
        event_description: {
            SALE_APPROVED: 'Compra aprovada',
            SALE_REFUSED: 'Compra recusada',
            SALE_REFUNDED: 'Reembolso',
            SALE_CHARGEBACK: 'Chargeback',
            BANK_SLIP_GENERATED: 'Boleto gerado',
            BANK_SLIP_EXPIRED: 'Boleto expirado',
            PIX_GENERATED: 'PIX gerado',
            PIX_EXPIRED: 'PIX expirado',
            ABANDONED_CART: 'Carrinho abandonado',
            SUBSCRIPTION_CANCELED: 'Assinatura cancelada',
            SUBSCRIPTION_EXPIRED: 'Assinatura atrasada',
            SUBSCRIPTION_RENEWED: 'Assinatura renovada',
        }[kirEventType] || kirEventType,
        checkout_id: `KV${ts}${i}`.slice(0, 8).toUpperCase(),
        sale_id: isAbandoned ? undefined : `SA${ts}${i}`.slice(0, 8).toUpperCase(),
        checkout_url: (isAbandoned || isBankSlip || isPix) ? `https://app.kirvano.com/recovery/${ts}${i}` : undefined,
        payment_method: isBankSlip ? 'BANK_SLIP' : isPix ? 'PIX' : 'CREDIT_CARD',
        total_price: isOB ? 'R$ 196,80' : 'R$ 169,80',
        type: isSubscription ? 'RECURRING' : 'ONE_TIME',
        status: {
            SALE_APPROVED: 'APPROVED',
            SALE_REFUSED: 'REFUSED',
            SALE_REFUNDED: 'REFUNDED',
            SALE_CHARGEBACK: 'CHARGEBACK',
            BANK_SLIP_GENERATED: 'PENDING',
            BANK_SLIP_EXPIRED: 'CANCELED',
            PIX_GENERATED: 'PENDING',
            PIX_EXPIRED: 'CANCELED',
            ABANDONED_CART: 'ABANDONED_CART',
            SUBSCRIPTION_CANCELED: 'CANCELED',
            SUBSCRIPTION_EXPIRED: 'PENDING',
            SUBSCRIPTION_RENEWED: 'APPROVED',
        }[kirEventType] || 'PENDING',
        created_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
        customer: {
            name,
            document: `${23875090000 + i}`,
            email,
            phone_number: phone.replace('+', ''),
        },
        payment: isBankSlip ? {
            method: 'BANK_SLIP',
            link: `https://app.kirvano.com/bankslip/${ts}${i}/download`,
            digitable_line: '30282023186900000000500000179044184750000016980',
            barcode: '30281847500000169802023169000000000000017904',
            expires_at: new Date(Date.now() + 2 * 86400000).toISOString().replace('T', ' ').slice(0, 19),
        } : isPix ? {
            method: 'PIX',
            qrcode: `00020201011325br.gov.bcb.pix${ts}${i}`,
            qrcode_image: `https://app.kirvano.com/pix/${ts}${i}`,
            expires_at: new Date(Date.now() + 3600000).toISOString().replace('T', ' ').slice(0, 19),
        } : isAbandoned ? undefined : {
            method: 'CREDIT_CARD',
            brand: 'visa',
            installments: 1,
            finished_at: ['SALE_APPROVED', 'SALE_REFUNDED', 'SALE_CHARGEBACK', 'SUBSCRIPTION_RENEWED'].includes(kirEventType)
                ? new Date().toISOString().replace('T', ' ').slice(0, 19) : undefined,
        },
        plan: isSubscription ? {
            name: 'Plano Anual',
            charge_frequency: 'ANNUALLY',
            next_charge_date: new Date(Date.now() + 365 * 86400000).toISOString().replace('T', ' ').slice(0, 19),
        } : undefined,
        products: eventType === 'SALE_APPROVED_OB' ? [
            {
                id: `prod-scale-${ts}`,
                name: 'Produto Scale Test',
                offer_id: `offer-scale-${ts}`,
                offer_name: 'Produto Scale Test',
                description: 'Produto gerado para teste de escala',
                price: 'R$ 169,80',
                photo: 'https://placehold.co/600x400',
                is_order_bump: false,
            },
            {
                id: `prod-ob-${ts}`,
                name: 'E-book Bônus Scale Test',
                offer_id: `offer-ob-${ts}`,
                offer_name: 'E-book Bônus',
                description: 'Order bump gerado para teste de escala',
                price: 'R$ 27,00',
                photo: 'https://placehold.co/600x400',
                is_order_bump: true,
            },
        ] : [
            {
                id: `prod-scale-${ts}`,
                name: 'Produto Scale Test',
                offer_id: `offer-scale-${ts}`,
                offer_name: 'Produto Scale Test',
                description: 'Produto gerado para teste de escala',
                price: 'R$ 169,80',
                photo: 'https://placehold.co/600x400',
                is_order_bump: false,
            }
        ],
        utm: { utm_source: 'scale_test', utm_medium: 'webhook_test', utm_campaign: `test_${ts}` },
    };
    return JSON.parse(JSON.stringify(base));
}
