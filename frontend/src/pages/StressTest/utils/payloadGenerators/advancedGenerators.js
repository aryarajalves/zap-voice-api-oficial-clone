import { getFakeContactData } from './common';

export function generateGuruPayload(eventType, index) {
    const { i, name, email, phoneNum, ddd, ts } = getFakeContactData(index);
    const isSubscriptionEvent = eventType.startsWith('subscription_');
    const isPixEvent = eventType === 'waiting_payment_pix' || eventType === 'expired_pix';
    const isBilletEvent = eventType === 'billet_printed' || eventType === 'expired_billet';
    const isOB = eventType === 'approved_order_bump';
    const isUpsell = eventType === 'approved_upsell';

    if (isSubscriptionEvent) {
        const lastStatus = eventType === 'subscription_active' ? 'active'
            : eventType === 'subscription_canceled' ? 'canceled'
            : 'delayed';
        return {
            webhook_type: 'subscription',
            last_status: lastStatus,
            subscriber: {
                name, email,
                phone_local_code: '55',
                phone_number: `${ddd}${phoneNum}`,
                address_country: 'BR',
            },
            product: { name: 'Produto Scale Test', type: 'plan' },
            current_invoice: { value: 97.00, cycle: 2, status: 'paid' },
            payment_method: 'credit_card',
            id: `sub_GURU${ts}${i}`,
            name: 'Plano Mensal Scale Test',
        };
    }

    const guruStatus = isPixEvent
        ? (eventType === 'waiting_payment_pix' ? 'waiting_payment' : 'expired')
        : isBilletEvent
            ? (eventType === 'billet_printed' ? 'billet_printed' : 'expired')
            : (isOB || isUpsell) ? 'approved' : eventType;

    const guruMethod = isPixEvent ? 'pix' : isBilletEvent ? 'billet' : 'credit_card';

    const payloadOut = {
        webhook_type: 'transaction',
        status: guruStatus,
        id: `GURU${ts}${i}`,
        api_token: 'test_token_guru_scale',
        checkout_url: `https://clkdmg.site/checkout/${ts}${i}`,
        contact: {
            name, email,
            phone_local_code: '55',
            phone_number: `${ddd}${phoneNum}`,
            address_country: 'BR',
            address_city: 'São Paulo',
            address_state: 'SP',
        },
        product: {
            name: isUpsell ? 'Produto Upsell Premium' : 'Produto Scale Test',
            type: 'product',
            total_value: isOB ? 294.00 : isUpsell ? 497.00 : 197.00,
            unit_value: isUpsell ? 497.00 : 197.00,
            qty: 1,
        },
        payment: {
            method: guruMethod,
            total: isOB ? 294.00 : isUpsell ? 497.00 : 197.00,
            gross: isOB ? 294.00 : isUpsell ? 497.00 : 197.00,
            net: isOB ? 260.00 : isUpsell ? 450.00 : 178.00,
            currency: 'BRL',
            billet: isBilletEvent ? {
                url: `https://clkdmg.site/billet/${ts}${i}`,
                line: '30282023186900000000500000179044184750000019700',
                expiration_date: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
            } : { url: '', line: '', expiration_date: '' },
            pix: isPixEvent ? {
                qrcode: {
                    signature: `00020201011325br.gov.bcb.pix${ts}${i}`,
                    url: `https://clkdmg.site/pix/${ts}${i}`,
                },
                expiration_date: new Date(Date.now() + 3600000).toISOString().slice(0, 10),
            } : null,
            credit_card: guruMethod === 'credit_card' ? { brand: 'visa', last_digits: '0010', first_digits: '400000' } : null,
            installments: { qty: 1, value: isOB ? 294.00 : isUpsell ? 497.00 : 197.00, interest: 0 },
        },
        infrastructure: { country: 'BR', ip: '127.0.0.1' },
    };

    if (isOB) {
        payloadOut.products = [
            { id: 1, name: 'Produto Scale Test', total_value: 197.00, qty: 1, is_order_bump: false },
            { id: 2, name: 'Produto Order Bump', total_value: 97.00, qty: 1, is_order_bump: true }
        ];
    } else {
        payloadOut.products = [
            { id: 1, name: isUpsell ? 'Produto Upsell Premium' : 'Produto Scale Test', total_value: isUpsell ? 497.00 : 197.00, qty: 1, is_order_bump: false }
        ];
    }

    return payloadOut;
}

export function generateHeroSparkPayload(eventType, index) {
    const { i, name, email, phoneNum, ddd, ts } = getFakeContactData(index);
    const isPix    = eventType.endsWith('_pix');
    const isBoleto = eventType.endsWith('_boleto');
    const isCard   = eventType.endsWith('_card');
    const isOB     = eventType.endsWith('_order_bump');
    const isUpsell = eventType.endsWith('_upsell');

    const hsEvent = eventType
        .replace(/_pix$/, '')
        .replace(/_boleto$/, '')
        .replace(/_card$/, '')
        .replace(/_order_bump$/, '')
        .replace(/_upsell$/, '');

    const payType = isPix ? 'pix' : isBoleto ? 'bank_slip' : 'credit_card';
    const priceVal = isOB ? 29700 : isUpsell ? 49700 : 19700;

    const basePayload = {
        event: hsEvent,
        id: `hs_${ts}${i}`,
        buyer: {
            name,
            email,
            phone: `55${ddd}${phoneNum}`,
            doc: `000.000.000-0${i}`,
        },
        product: {
            id: `prod_${ts}`,
            name: isUpsell ? 'Produto Upsell Premium' : 'Produto Scale Test',
        },
        purchase: {
            price: {
                gross: priceVal,
                value: priceVal,
            },
            status: hsEvent === 'PURCHASE_APPROVED' ? 'paid'
                : hsEvent === 'PURCHASE_CANCELED' ? 'canceled'
                : hsEvent === 'PURCHASE_REFUNDED' ? 'refunded'
                : hsEvent === 'PURCHASE_CHARGEBACK' ? 'chargedback'
                : 'pending',
            payment: {
                type: payType,
                refusal_reason: isCard && hsEvent === 'PURCHASE_CANCELED' ? 'Saldo insuficiente' : null,
            },
            created_at: new Date().toISOString(),
            transaction: `pay_${ts}${i}`,
            subscription: ['SUBSCRIPTION_CANCELED', 'SUBSCRIPTION_RENEWED', 'PURCHASE_DELAYED'].includes(hsEvent)
                ? { id: `sub_${ts}${i}`, status: hsEvent === 'SUBSCRIPTION_CANCELED' ? 'canceled' : 'active' }
                : null,
        },
    };

    if (isOB) {
        basePayload.purchaseBumpUsed = true;
        basePayload.bump = [
            {
                id: `prod_ob_${ts}`,
                name: 'Produto Order Bump',
                price: { gross: 9700, value: 9700 },
            },
        ];
    }

    if (isUpsell) {
        basePayload.upsell = true;
    }

    return basePayload;
}

export function generateHublaPayload(eventType, index) {
    const { i, name, email, phoneNum, ddd, ts } = getFakeContactData(index);
    const hublaTypeParts = eventType.split('_');
    const hublaSuffix = hublaTypeParts[hublaTypeParts.length - 1];
    const hublaBase = eventType
        .replace(/_card$/, '')
        .replace(/_boleto$/, '')
        .replace(/_pix$/, '')
        .replace(/_chargeback$/, '');

    const isPix = hublaSuffix === 'pix';
    const isBoleto = hublaSuffix === 'boleto';
    const paymentMethod = isPix ? 'pix' : isBoleto ? 'bank_slip' : 'credit_card';

    const isSubscription = hublaBase.startsWith('subscription.');
    const isLead = hublaBase.startsWith('lead.');

    const invoiceStatus = hublaBase === 'invoice.status_updated'
        ? (hublaSuffix === 'chargeback' ? 'chargeback' : 'paid')
        : hublaBase === 'invoice.refunded' ? 'refunded'
        : hublaBase === 'invoice.payment_failed' ? 'unpaid'
        : hublaBase === 'invoice.expired' ? 'expired'
        : hublaBase === 'invoice.payment_succeeded' ? 'paid'
        : 'unpaid';

    const invoiceObj = {
        id: `inv_${ts}${i}`,
        status: invoiceStatus,
        paymentMethod,
        currency: 'BRL',
        amount: { totalCents: 19700, subtotalCents: 19700, discountCents: 0, feeCents: 0 },
        payer: {
            firstName: 'Contato', lastName: `Teste ${i}`,
            email, phone: `+55${ddd}${phoneNum}`,
        },
        billingAddress: { countryCode: 'BR', state: 'SP', city: 'São Paulo' },
        pixQrCode: isPix ? `00020201011325br.gov.bcb.pix${ts}${i}` : null,
        boletoUrl: isBoleto ? `https://boleto.hubla.com.br/${ts}${i}` : null,
        dueAt: new Date(Date.now() + 3 * 86400000).toISOString(),
    };

    const userObj = {
        id: `usr_${ts}${i}`,
        firstName: 'Contato', lastName: `Teste ${i}`,
        email, phone: `+55${ddd}${phoneNum}`,
    };

    const subscriptionObj = isSubscription ? {
        id: `sub_${ts}${i}`,
        status: hublaBase === 'subscription.activated' ? 'active' : 'inactive',
        paymentMethod,
        amount: { totalCents: 19700 },
        billingAddress: { countryCode: 'BR' },
        lastInvoice: invoiceObj,
    } : null;

    return {
        id: `evt_${ts}${i}`,
        type: hublaBase,
        version: '2.0.0',
        createdAt: new Date().toISOString(),
        event: {
            product: { id: `prod_${ts}`, name: 'Produto Scale Test' },
            user: isSubscription || isLead ? userObj : undefined,
            invoice: !isSubscription && !isLead ? invoiceObj : undefined,
            subscription: isSubscription ? subscriptionObj : undefined,
            lead: isLead ? {
                id: `lead_${ts}${i}`,
                firstName: 'Contato', lastName: `Teste ${i}`,
                email, phone: `+55${ddd}${phoneNum}`,
            } : undefined,
        },
    };
}

export function generateElementorPayload(eventType, index) {
    const { i, name, email, phone, ts } = getFakeContactData(index);
    if (eventType === 'form_submission_simple') {
        return { name, email, phone, fullname: name };
    }
    if (eventType === 'form_submission_nested') {
        return {
            form_id: `elem_${ts}${i}`,
            form_name: 'Formulário Scale Test',
            fields: {
                name: { id: 'name', value: name },
                whatsapp: { id: 'whatsapp', value: phone },
                email: { id: 'email', value: email },
            },
        };
    }
    return {
        'fields[name][value]': name,
        'fields[name][title]': 'Seu nome',
        'fields[email][value]': email,
        'fields[email][title]': 'Seu melhor email',
        'fields[phone][value]': phone,
        'fields[phone][title]': 'Whatsapp',
        'form[name]': 'Formulário Scale Test',
        'form[id]': `elem_${ts}${i}`,
        'meta[credit][value]': 'Elementor',
    };
}

export function generatePagTrustPayload(eventType, index) {
    const { i, name, email, phone, phoneNum, ddd, ts } = getFakeContactData(index);
    const isPagtustPix = eventType === 'pending_pix';
    const isPagtrustBoleto = eventType === 'pending_boleto';
    const isPagtrustAbandoned = eventType === 'abandoned_cart';
    const isPagtrustRefusedPix = eventType === 'refused_pix';
    const isPagtrustOB = eventType === 'approved_order_bump';

    if (isPagtrustOB) {
        return {
            status: 'approved',
            payment_type: 'CREDIT_CARD',
            name,
            first_name: name.split(' ')[0],
            last_name: name.split(' ').slice(1).join(' '),
            email,
            phone_local_code: ddd,
            phone_number: phoneNum,
            prod_name: 'E-book Bônus Scale Test',
            price: '27.00',
            full_price: '27.00',
            currency: 'BRL',
            transaction: `PT${ts}${i}`,
            purchase_date: new Date().toISOString(),
            confirmation_purchase_date: new Date().toISOString(),
            payment_engine: 'pagtrust',
            order_bump: 'true',
        };
    }

    const pagtrustStatus = isPagtustPix || isPagtrustBoleto ? 'pending'
        : isPagtrustAbandoned ? 'abandoned_cart'
        : isPagtrustRefusedPix ? 'refused'
        : eventType;

    const pagtrustPaymentType = isPagtustPix || isPagtrustRefusedPix ? 'PIX'
        : isPagtrustBoleto ? 'BILLET'
        : 'CREDIT_CARD';

    if (isPagtrustAbandoned) {
        return {
            status: 'abandoned_cart',
            buyerVOName: name,
            buyerVOEmail: email,
            customerFullName: name,
            customerEmail: email,
            customerFullPhoneNumber: phone.replace('+', ''),
            buyerVO: { name, email, phone: phone.replace('+', '') },
            productName: 'Produto Scale Test',
            productUCode: 'Produto Scale Test',
            payment_engine: 'pagtrust',
        };
    }

    return {
        status: pagtrustStatus,
        payment_type: pagtrustPaymentType,
        name,
        first_name: name.split(' ')[0],
        last_name: name.split(' ').slice(1).join(' '),
        email,
        phone_local_code: ddd,
        phone_number: phoneNum,
        phone_checkout_local_code: ddd,
        phone_checkout_number: phoneNum,
        prod_name: 'Produto Scale Test',
        price: '97.00',
        full_price: '97.00',
        currency: 'BRL',
        transaction: `PT${ts}${i}`,
        transaction_ext: `PT${ts}${i}`,
        purchase_date: new Date().toISOString(),
        confirmation_purchase_date: new Date().toISOString(),
        payment_engine: 'pagtrust',
        order_bump: 'false',
    };
}

export function generateZapGroupPayload(index) {
    const { phone } = getFakeContactData(index);
    return {
        nome: phone,
        grupo: 'Grupo Lancamento Teste',
        numero: phone,
        grupo_jid: '120363405673797894@g.us',
        extraido_em: new Date().toISOString()
    };
}
