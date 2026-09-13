import { getFakeContactData } from '../common';

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
