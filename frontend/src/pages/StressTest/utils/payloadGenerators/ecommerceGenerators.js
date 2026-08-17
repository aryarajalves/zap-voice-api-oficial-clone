import { getFakeContactData } from './common';

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
            expires_at: new Date(Date.now() + 2*86400000).toISOString().replace('T', ' ').slice(0, 19),
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
            next_charge_date: new Date(Date.now() + 365*86400000).toISOString().replace('T', ' ').slice(0, 19),
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

export function generateHotmartPayload(eventType, index) {
    const { i, name, email, phoneNum, ddd, ts } = getFakeContactData(index);
    if (eventType === 'PURCHASE_APPROVED_OB') {
        return {
            event: 'PURCHASE_APPROVED',
            data: {
                buyer: { name, email },
                product: { name: 'E-book Bônus Scale Test', id: '999002' },
                purchase: {
                    status: 'APPROVED',
                    transaction: `HP${ts}${i}`,
                    is_order_bump: true,
                    payment: { type: 'CREDIT_CARD' },
                    price: { value: 27.00, currency_value: 'BRL' },
                },
                subscriber: { phone: { cell: phoneNum, dddCell: ddd } }
            }
        };
    }
    return {
        event: eventType,
        data: {
            buyer: { name, email },
            product: { name: 'Produto Scale Test', id: '999001' },
            purchase: {
                status: 'APPROVED',
                transaction: `HP${ts}${i}`,
                is_order_bump: false,
                payment: { type: 'CREDIT_CARD' },
                price: { value: 169.80, currency_value: 'BRL' },
            },
            subscriber: { phone: { cell: phoneNum, dddCell: ddd } }
        }
    };
}

export function generateKiwifyPayload(eventType, index) {
    const { i, name, email, phone, ts } = getFakeContactData(index);
    if (eventType === 'paid_ob') {
        return {
            order_id: `KW${ts}${i}`,
            order_status: 'paid',
            Customer: { full_name: name, email, mobile: phone },
            Product: { title: 'Produto Scale Test', id: '999001' },
            OrderBumps: [
                { product: { title: 'E-book Bônus Scale Test', id: '999002' }, price: 27.00 }
            ],
        };
    }
    let kiwifyOrderStatus = eventType;
    let kiwifyPaymentMethod = null;
    if (eventType === 'waiting_payment_boleto') {
        kiwifyOrderStatus = 'waiting_payment';
        kiwifyPaymentMethod = 'billet';
    } else if (eventType === 'waiting_payment_pix') {
        kiwifyOrderStatus = 'waiting_payment';
        kiwifyPaymentMethod = 'pix';
    }
    const kiwifyPayload = {
        order_id: `KW${ts}${i}`,
        order_status: kiwifyOrderStatus,
        Customer: { full_name: name, email, mobile: phone },
        Product: { title: 'Produto Scale Test', id: '999001' },
    };
    if (kiwifyPaymentMethod) kiwifyPayload.payment_method = kiwifyPaymentMethod;
    return kiwifyPayload;
}

export function generateEduzzPayload(eventType, index) {
    const { i, name, email, phone, ts } = getFakeContactData(index);
    if (eventType === 'nutror_aluno') {
        return {
            event: 'nutror.subscription',
            data: {
                learner: { name, email, phone },
                course: { title: 'Produto Scale Test', id: '999001' }
            }
        };
    }
    if (eventType === 'paid_with_bump') {
        return {
            event: 'sun.order_paid',
            data: {
                buyer: { name, email, cellphone: phone },
                items: [
                    { name: 'Produto Scale Test', price: { value: 97.00 } },
                    { name: 'E-book Bônus Scale Test', price: { value: 27.00 } },
                ],
                status: 'paid',
                paymentMethod: 'credit_card',
                price: { value: 124.00, currency: 'BRL' },
                transactionId: `ED${ts}${i}`
            }
        };
    }
    let eduzzStatus = eventType;
    let eduzzPaymentMethod = 'credit_card';
    if (eventType === 'waiting_payment_boleto') {
        eduzzStatus = 'waiting_payment';
        eduzzPaymentMethod = 'boleto';
    } else if (eventType === 'waiting_payment_pix') {
        eduzzStatus = 'waiting_payment';
        eduzzPaymentMethod = 'pix';
    }
    return {
        event: `sun.order_${eduzzStatus === 'abandoned_cart' ? 'cart_abandonment' : eduzzStatus}`,
        data: {
            buyer: { name, email, cellphone: phone },
            items: [{ name: 'Produto Scale Test', price: { value: 97.00 } }],
            status: eduzzStatus,
            paymentMethod: eduzzPaymentMethod,
            price: { value: 97.00, currency: 'BRL' },
            transactionId: `ED${ts}${i}`
        }
    };
}

export function generateTictoPayload(eventType, index) {
    const { i, name, email, phone, ts } = getFakeContactData(index);
    if (eventType === 'purchase.approved_ob') {
        return {
            event: 'purchase.approved',
            order: {
                id: `TC${ts}${i}`,
                status: 'approved',
                payment_method: 'credit_card',
                total_price: 124.00,
                buyer: { name, email, phone_number: phone },
                product: { name: 'Produto Scale Test', id: '999001' },
                order_bumps: [
                    { product: { name: 'E-book Bônus Scale Test', id: '999002' }, price: 27.00 }
                ],
            },
        };
    }
    let tictoEvent = eventType;
    let tictoPaymentMethod = 'credit_card';
    if (eventType === 'purchase.waiting_boleto') {
        tictoEvent = 'purchase.waiting_payment';
        tictoPaymentMethod = 'boleto';
    } else if (eventType === 'purchase.waiting_pix') {
        tictoEvent = 'purchase.waiting_payment';
        tictoPaymentMethod = 'pix';
    } else if (eventType === 'subscription.late') {
        tictoEvent = 'subscription.late';
    }
    const tictoStatus = ['purchase.approved'].includes(eventType) ? 'approved'
        : ['purchase.refused', 'purchase.canceled'].includes(eventType) ? 'canceled'
        : ['purchase.refunded', 'purchase.chargeback'].includes(eventType) ? 'refunded'
        : 'pending';
    return {
        event: tictoEvent,
        order: {
            id: `TC${ts}${i}`,
            status: tictoStatus,
            payment_method: tictoPaymentMethod,
            total_price: 97.00,
            buyer: { name, email, phone_number: phone },
            product: { name: 'Produto Scale Test', id: '999001' }
        }
    };
}

export function generatePepperPayload(eventType, index) {
    const { i, name, email, phone, ts } = getFakeContactData(index);
    if (eventType === 'PURCHASE_APPROVED_OB') {
        return {
            event: 'PURCHASE_APPROVED',
            data: {
                customer: { name, email, phone },
                product: { name: 'Produto Scale Test', id: '999001' },
                transaction: { id: `PP${ts}${i}`, status: 'approved', price: 124.00, payment_method: 'credit_card' },
                order_bumps: [
                    { product: { name: 'E-book Bônus Scale Test', id: '999002' }, price: 27.00 }
                ],
            },
        };
    }
    let pepperPaymentMethod = 'credit_card';
    if (eventType === 'BILLET_GENERATED') pepperPaymentMethod = 'boleto';
    else if (eventType === 'PIX_GENERATED') pepperPaymentMethod = 'pix';
    return {
        event: eventType,
        data: {
            customer: { name, email, phone },
            product: { name: 'Produto Scale Test', id: '999001' },
            transaction: { id: `PP${ts}${i}`, status: 'approved', price: 97.00, payment_method: pepperPaymentMethod }
        }
    };
}

export function generateBraipPayload(eventType, index) {
    const { i, name, email, phone, ts } = getFakeContactData(index);
    if (eventType === 'approved_ob') {
        return {
            event: 'approved',
            status: 'approved',
            transaction: `BR${ts}${i}`,
            contact_name: name,
            contact_email: email,
            contact_phone: phone,
            product_title: 'Produto Scale Test',
            payment_method: 'credit_card',
            price: 97.00,
            order_bump: {
                product_title: 'E-book Bônus Scale Test',
                price: 27.00,
            },
        };
    }
    const braipEventRaw = eventType === 'billet_pix' ? 'billet' : eventType;
    const braipPaymentMethod = eventType === 'billet_pix' ? 'pix'
        : eventType === 'billet' ? 'boleto'
        : 'credit_card';
    return {
        event: braipEventRaw,
        status: braipEventRaw,
        transaction: `BR${ts}${i}`,
        contact_name: name,
        contact_email: email,
        contact_phone: phone,
        product_title: 'Produto Scale Test',
        payment_method: braipPaymentMethod,
        price: 97.00
    };
}

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
