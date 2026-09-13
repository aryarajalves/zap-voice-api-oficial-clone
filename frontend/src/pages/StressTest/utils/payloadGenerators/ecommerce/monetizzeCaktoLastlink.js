import { getFakeContactData } from '../common';

export function generateMonetizzePayload(eventType, index) {
    const { i, name, email, phone, ts } = getFakeContactData(index);
    if (eventType === 'approved_ob') {
        return {
            sale_id: ts + i,
            type: 'upsell',
            status: { id: 3, name: 'Aprovado' },
            consumer: { name, email, cellphone: phone },
            product: { name: 'E-book Bônus Scale Test', price: 27.00 },
            main_product: { name: 'Produto Scale Test', price: 97.00 },
            payment_method: { name: 'Cartão de Crédito' },
            value: 27.00,
            utm_source: 'scale_test',
            utm_medium: 'webhook_test',
            utm_campaign: `test_${ts}`,
        };
    }
    const MONETIZZE_STATUS_MAP = {
        approved:              { id: 3,  name: 'Aprovado' },
        canceled:              { id: 4,  name: 'Cancelado' },
        refunded:              { id: 5,  name: 'Estornado' },
        chargeback:            { id: 6,  name: 'Chargeback' },
        boleto:                { id: 20, name: 'Aguardando Pagamento' },
        pix:                   { id: 21, name: 'Aguardando Pagamento' },
        overdue:               { id: 22, name: 'Inadimplente' },
        subscription_canceled: { id: 4,  name: 'Cancelado' },
        subscription_renewed:  { id: 3,  name: 'Aprovado' },
        abandoned:             { id: 9,  name: 'Abandonado' },
    };
    const mStatus = MONETIZZE_STATUS_MAP[eventType] || { id: 3, name: 'Aprovado' };
    const mPaymentMethod = eventType === 'pix' ? 'PIX'
        : eventType === 'boleto' ? 'Boleto'
        : 'Cartão de Crédito';
    const mType = ['subscription_canceled', 'subscription_renewed', 'overdue'].includes(eventType)
        ? 'subscription' : 'sale';
    return {
        sale_id: ts + i,
        type: mType,
        status: mStatus,
        consumer: { name, email, cellphone: phone },
        product: { name: 'Produto Scale Test', price: 97.00 },
        payment_method: { name: mPaymentMethod },
        value: 97.00,
        utm_source: 'scale_test',
        utm_medium: 'webhook_test',
        utm_campaign: `test_${ts}`,
    };
}

export function generateCaktoPayload(eventType, index) {
    const { i, name, email, phone, ts } = getFakeContactData(index);
    if (eventType === 'order.paid_ob') {
        return {
            event: 'order.paid',
            data: {
                order: {
                    id: `CK${ts}${i}`,
                    status: 'paid',
                    payment_method: 'credit_card',
                    total: 124.00,
                    currency: 'BRL',
                    order_bumps: [
                        { product: { name: 'E-book Bônus Scale Test', id: '999002' }, price: 27.00 }
                    ],
                },
                customer: { name, email, phone },
                product: { name: 'Produto Scale Test', id: '999001' },
                utm: { utm_source: 'scale_test', utm_medium: 'webhook_test', utm_campaign: `test_${ts}` },
            },
        };
    }
    const caktoPaymentMethod = eventType === 'order.pix_generated' || eventType === 'order.pix_expired' ? 'pix'
        : eventType === 'order.billet_generated' ? 'billet'
        : 'credit_card';
    return {
        event: eventType,
        data: {
            order: {
                id: `CK${ts}${i}`,
                status: eventType.includes('paid') || eventType.includes('approved') ? 'paid'
                    : eventType.includes('refunded') || eventType.includes('chargeback') ? 'refunded'
                    : eventType.includes('canceled') || eventType.includes('refused') ? 'canceled'
                    : 'pending',
                payment_method: caktoPaymentMethod,
                total: 97.00,
                currency: 'BRL',
            },
            customer: { name, email, phone },
            product: { name: 'Produto Scale Test', id: '999001' },
            utm: { utm_source: 'scale_test', utm_medium: 'webhook_test', utm_campaign: `test_${ts}` },
        },
    };
}

export function generateLastlinkPayload(eventType, index) {
    const { i, name, email, phone, ts } = getFakeContactData(index);
    const isUpsell      = eventType === 'Purchase_Order_Confirmed_Upsell';
    const llEvent       = isUpsell ? 'Purchase_Order_Confirmed'
        : eventType.endsWith('_Boleto') || eventType.endsWith('_Pix')
            ? eventType.replace(/_Boleto$|_Pix$/, '')
            : eventType;
    const isBoleto      = eventType.endsWith('_Boleto');
    const isPix         = eventType.endsWith('_Pix');
    const payMethod     = isPix ? 'pix' : isBoleto ? 'bankslip' : 'credit_card';
    const isAbandoned   = llEvent === 'Abandoned_Cart';

    const base = {
        Id: `LL-${ts}-${i}`,
        IsTest: true,
        Event: llEvent,
        CreatedAt: new Date().toISOString(),
        Data: {
            Products: [{ Id: `prod-${ts}`, Name: 'Produto Scale Test', Price: 197.00 }],
            Buyer: {
                Id: `buyer-${ts}-${i}`,
                Email: email,
                Name: name,
                PhoneNumber: phone,
                Document: `${23875090000 + i}`,
            },
            Offer: {
                Id: `offer-${ts}`,
                Name: 'Oferta Scale Test',
                Url: `https://lastlink.com/p/SCALETEST${i}`,
            },
        },
    };

    if (!isAbandoned) {
        base.Data.Purchase = {
            PaymentId: `pay-${ts}-${i}`,
            Recurrency: llEvent === 'Recurrent_Payment' ? 2 : 1,
            PaymentDate: new Date().toISOString(),
            ChargebackDate: llEvent === 'Payment_Chargeback' ? new Date().toISOString() : null,
            OriginalPrice: { Value: 197.00 },
            Price: { Value: 197.00 },
            Payment: { NumberOfInstallments: 1, PaymentMethod: payMethod },
            InvoiceUrl: `https://invoices.lastlink.com/pay-${ts}-${i}`,
            IsUpsell: isUpsell,
        };
        base.Data.Subscriptions = llEvent.includes('Subscription') || llEvent === 'Recurrent_Payment'
            ? [{ Id: `sub-${ts}-${i}`, ProductId: `prod-${ts}` }]
            : [];
    }

    return base;
}
