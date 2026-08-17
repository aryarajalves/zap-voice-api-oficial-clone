import { getFakeContactData } from './common';

export function generateGreennPayload(eventType, index) {
    const { i, name, email, phoneNum, ddd } = getFakeContactData(index);
    const isContract = eventType.startsWith('contract_');
    const isLead = eventType === 'lead_abandoned';
    const isOB = eventType === 'sale_paid_order_bump';
    const isUpsell = eventType === 'sale_paid_upsell';
    const isPix = eventType.includes('_pix');
    const isBoleto = eventType.includes('_boleto');
    const method = isPix ? 'PIX' : isBoleto ? 'BOLETO' : 'CREDIT_CARD';

    const greennStatus = eventType
        .replace('sale_', '')
        .replace('_card', '')
        .replace('_boleto', '')
        .replace('_pix', '')
        .replace('_order_bump', '')
        .replace('_upsell', '')
        .replace('contract_', '')
        .replace('lead_abandoned', 'checkoutAbandoned');

    const clientObj = {
        id: i,
        name,
        email,
        cellphone: `${ddd}${phoneNum}`,
        cpf_cnpj: `000.000.000-0${i}`,
        city: 'São Paulo',
        uf: 'SP',
        street: 'Rua Teste',
        number: String(i),
        neighborhood: 'Centro',
        zipcode: '01001000',
        complement: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };

    const productObj = {
        id: i,
        name: isUpsell ? 'Produto Upsell Premium' : 'Produto Scale Test',
        amount: isUpsell ? 497 : 197,
        type: isContract ? 'SUBSCRIPTION' : 'TRANSACTION',
        method,
        is_active: 1,
        period: isContract ? 30 : 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };

    if (isLead) {
        return {
            type: 'lead',
            event: 'checkoutAbandoned',
            lead: {
                ...clientObj,
                step: 1,
            },
            product: productObj,
            seller: { id: 1, name: 'Vendedor Teste', email: 'vendedor@test.com', cellphone: '' },
            productMetas: [],
            proposalMetas: [],
        };
    }

    if (isContract) {
        const contractStatus = greennStatus === 'paid' ? 'paid'
            : greennStatus === 'canceled' ? 'canceled'
            : 'unpaid';
        return {
            type: 'contract',
            event: 'contractUpdated',
            oldStatus: 'paid',
            currentStatus: contractStatus,
            product: productObj,
            currentSale: {
                id: i,
                status: 'paid',
                method,
                amount: 197,
                installments: 1,
                type: 'SUBSCRIPTION',
                client_id: i,
                seller_id: 1,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                coupon: null,
            },
            contract: {
                id: i,
                status: contractStatus,
                start_date: new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
                current_period_end: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            },
            seller: { id: 1, name: 'Vendedor Teste', email: 'vendedor@test.com', cellphone: '' },
            client: clientObj,
            saleMetas: [],
        };
    }

    const saleStatus = greennStatus === 'waiting' ? 'waiting_payment' : greennStatus;
    const payloadOut = {
        type: 'sale',
        event: 'saleUpdated',
        oldStatus: 'created',
        currentStatus: saleStatus,
        product: productObj,
        sale: {
            id: i,
            status: saleStatus,
            method,
            amount: isOB ? 294 : isUpsell ? 497 : 197,
            installments: 1,
            type: 'TRANSACTION',
            client_id: i,
            seller_id: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            coupon: null,
        },
        seller: { id: 1, name: 'Vendedor Teste', email: 'vendedor@test.com', cellphone: '' },
        client: clientObj,
        saleMetas: [],
    };

    if (isOB) {
        payloadOut.products = [
            { id: i, name: 'Produto Scale Test', amount: 197, is_order_bump: false },
            { id: i + 100, name: 'Produto Order Bump', amount: 97, is_order_bump: true }
        ];
    } else {
        payloadOut.products = [
            { id: i, name: isUpsell ? 'Produto Upsell Premium' : 'Produto Scale Test', amount: isUpsell ? 497 : 197, is_order_bump: false }
        ];
    }

    return payloadOut;
}
