import { getFakeContactData } from '../common';

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
