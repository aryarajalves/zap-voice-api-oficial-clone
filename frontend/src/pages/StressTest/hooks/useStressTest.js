import { useState, useEffect, useRef } from 'react';
import { API_URL, WEBHOOK_BASE_URL } from '../../../config';
import { fetchWithAuth } from '../../../AuthContext';
import { useAuth } from '../../../AuthContext';
import { useClient } from '../../../contexts/ClientContext';
import { toast } from 'react-hot-toast';

// ─── Webhook payload generators per platform ─────────────────────────────────
export const PLATFORM_EVENT_OPTIONS = {
    kirvano: [
        { value: 'SALE_APPROVED', label: 'Compra Aprovada' },
        { value: 'SALE_APPROVED_OB', label: 'Compra Aprovada + Order Bump' },
        { value: 'SALE_REFUSED', label: 'Compra Recusada' },
        { value: 'SALE_CANCELED', label: 'Compra Cancelada' },
        { value: 'SALE_REFUNDED', label: 'Reembolso' },
        { value: 'SALE_CHARGEBACK', label: 'Chargeback' },
        { value: 'BANK_SLIP_GENERATED', label: 'Boleto Gerado' },
        { value: 'BANK_SLIP_EXPIRED', label: 'Boleto Expirado' },
        { value: 'PIX_GENERATED', label: 'PIX Gerado' },
        { value: 'PIX_EXPIRED', label: 'PIX Expirado' },
        { value: 'ABANDONED_CART', label: 'Carrinho Abandonado' },
        { value: 'SUBSCRIPTION_CANCELED', label: 'Assinatura Cancelada' },
        { value: 'SUBSCRIPTION_EXPIRED', label: 'Assinatura Atrasada' },
        { value: 'SUBSCRIPTION_RENEWED', label: 'Assinatura Renovada' },
    ],
    hotmart: [
        { value: 'PURCHASE_APPROVED', label: 'Compra Aprovada' },
        { value: 'PURCHASE_APPROVED_OB', label: 'Compra Aprovada (Order Bump)' },
        { value: 'PURCHASE_CANCELED', label: 'Compra Cancelada' },
        { value: 'PURCHASE_REFUNDED', label: 'Reembolso' },
        { value: 'PURCHASE_CHARGEBACK', label: 'Chargeback' },
        { value: 'PURCHASE_PROTEST', label: 'Contestação / Disputa' },
        { value: 'PURCHASE_BILLET_PRINTED', label: 'Boleto Impresso' },
        { value: 'PURCHASE_COMPLETE', label: 'Compra Concluída' },
        { value: 'PURCHASE_DELAYED', label: 'Pagamento Atrasado' },
        { value: 'PURCHASE_EXPIRED', label: 'Compra Expirada' },
        { value: 'PURCHASE_OUT_OF_SHOPPING_CART', label: 'Removido do Carrinho' },
        { value: 'ABANDONED_CART', label: 'Carrinho Abandonado' },
        { value: 'SUBSCRIPTION_CANCELLATION', label: 'Assinatura Cancelada' },
        { value: 'SWITCH_PLAN', label: 'Troca de Plano' },
        { value: 'UPDATE_SUBSCRIPTION_CHARGE_DATE', label: 'Data de Cobrança Alterada' },
        { value: 'CLUB_FIRST_ACCESS', label: 'Acesso ao Clube (1º acesso)' },
        { value: 'CLUB_MODULE_COMPLETED', label: 'Módulo do Clube Concluído' },
    ],
    kiwify: [
        { value: 'paid', label: 'Compra Aprovada' },
        { value: 'paid_ob', label: 'Compra Aprovada + Order Bump' },
        { value: 'refused', label: 'Cartão Recusado' },
        { value: 'refunded', label: 'Reembolso' },
        { value: 'chargeback', label: 'Chargeback' },
        { value: 'waiting_payment_boleto', label: 'Boleto Gerado' },
        { value: 'waiting_payment_pix', label: 'PIX Gerado' },
        { value: 'abandoned', label: 'Carrinho Abandonado' },
        { value: 'subscription_canceled', label: 'Assinatura Cancelada' },
        { value: 'subscription_late', label: 'Assinatura Atrasada' },
        { value: 'subscription_renewed', label: 'Assinatura Renovada' },
    ],
    eduzz: [
        { value: 'paid', label: 'Compra Aprovada' },
        { value: 'paid_with_bump', label: 'Compra Aprovada + Order Bump' },
        { value: 'canceled', label: 'Cancelado / Recusado' },
        { value: 'refunded', label: 'Reembolso' },
        { value: 'waiting_payment_boleto', label: 'Boleto Gerado' },
        { value: 'waiting_payment_pix', label: 'PIX Gerado' },
        { value: 'abandoned_cart', label: 'Carrinho Abandonado' },
        { value: 'nutror_aluno', label: 'Evento de Aluno (Nutror)' },
    ],
    ticto: [
        { value: 'purchase.approved', label: 'Compra Aprovada' },
        { value: 'purchase.approved_ob', label: 'Compra Aprovada + Order Bump' },
        { value: 'purchase.refused', label: 'Cartão Recusado' },
        { value: 'purchase.canceled', label: 'Compra Cancelada' },
        { value: 'purchase.refunded', label: 'Reembolso' },
        { value: 'purchase.chargeback', label: 'Chargeback' },
        { value: 'purchase.waiting_boleto', label: 'Boleto Gerado' },
        { value: 'purchase.waiting_pix', label: 'PIX Gerado' },
        { value: 'purchase.abandoned_cart', label: 'Carrinho Abandonado' },
        { value: 'subscription.canceled', label: 'Assinatura Cancelada' },
        { value: 'subscription.renewed', label: 'Assinatura Renovada' },
        { value: 'subscription.overdue', label: 'Assinatura Atrasada' },
        { value: 'subscription.late', label: 'Assinatura Atrasada (late)' },
    ],
    pepper: [
        { value: 'PURCHASE_APPROVED', label: 'Compra Aprovada' },
        { value: 'PURCHASE_APPROVED_OB', label: 'Compra Aprovada + Order Bump' },
        { value: 'PURCHASE_REFUSED', label: 'Cartão Recusado' },
        { value: 'PURCHASE_CANCELED', label: 'Compra Cancelada' },
        { value: 'PURCHASE_REFUNDED', label: 'Reembolso' },
        { value: 'PURCHASE_CHARGEBACK', label: 'Chargeback' },
        { value: 'BILLET_GENERATED', label: 'Boleto Gerado' },
        { value: 'PIX_GENERATED', label: 'PIX Gerado' },
        { value: 'ABANDONED_CART', label: 'Carrinho Abandonado' },
    ],
    braip: [
        { value: 'approved', label: 'Compra Aprovada' },
        { value: 'approved_ob', label: 'Compra Aprovada + Order Bump' },
        { value: 'refused', label: 'Cartão Recusado' },
        { value: 'canceled', label: 'Cancelada' },
        { value: 'refunded', label: 'Reembolso' },
        { value: 'chargeback', label: 'Chargeback' },
        { value: 'billet', label: 'Boleto Gerado' },
        { value: 'billet_pix', label: 'PIX Gerado' },
        { value: 'abandoned', label: 'Carrinho Abandonado' },
    ],
    monetizze: [
        { value: 'approved', label: 'Compra Aprovada' },
        { value: 'approved_ob', label: 'Compra Aprovada + Order Bump' },
        { value: 'canceled', label: 'Cartão Recusado / Cancelado' },
        { value: 'refunded', label: 'Reembolso / Estorno' },
        { value: 'chargeback', label: 'Chargeback' },
        { value: 'boleto', label: 'Boleto Gerado' },
        { value: 'pix', label: 'PIX Gerado' },
        { value: 'overdue', label: 'Assinatura Inadimplente' },
        { value: 'subscription_canceled', label: 'Assinatura Cancelada' },
        { value: 'subscription_renewed', label: 'Assinatura Renovada' },
        { value: 'abandoned', label: 'Carrinho Abandonado' },
    ],
    cakto: [
        { value: 'order.paid', label: 'Compra Aprovada' },
        { value: 'order.paid_ob', label: 'Compra Aprovada + Order Bump' },
        { value: 'order.refused', label: 'Cartão Recusado' },
        { value: 'order.canceled', label: 'Compra Cancelada' },
        { value: 'order.refunded', label: 'Reembolso' },
        { value: 'order.chargedback', label: 'Chargeback' },
        { value: 'order.billet_generated', label: 'Boleto Gerado' },
        { value: 'order.pix_generated', label: 'PIX Gerado' },
        { value: 'order.pix_expired', label: 'PIX Expirado' },
        { value: 'order.abandoned', label: 'Carrinho Abandonado' },
        { value: 'subscription.canceled', label: 'Assinatura Cancelada' },
        { value: 'subscription.renewed', label: 'Assinatura Renovada' },
        { value: 'subscription.overdue', label: 'Assinatura Atrasada' },
    ],
    lastlink: [
        { value: 'Purchase_Order_Confirmed', label: 'Compra Aprovada' },
        { value: 'Purchase_Order_Confirmed_Upsell', label: 'Compra Aprovada (Upsell)' },
        { value: 'Payment_Refund', label: 'Reembolso' },
        { value: 'Payment_Chargeback', label: 'Chargeback' },
        { value: 'Purchase_Request_Canceled', label: 'Compra Cancelada' },
        { value: 'Purchase_Request_Confirmed_Boleto', label: 'Boleto Gerado' },
        { value: 'Purchase_Request_Confirmed_Pix', label: 'PIX Gerado' },
        { value: 'Purchase_Request_Expired_Boleto', label: 'Boleto Expirado' },
        { value: 'Purchase_Request_Expired_Pix', label: 'PIX Expirado' },
        { value: 'Abandoned_Cart', label: 'Carrinho Abandonado' },
        { value: 'Recurrent_Payment', label: 'Assinatura Renovada' },
        { value: 'Subscription_Canceled', label: 'Assinatura Cancelada' },
        { value: 'Subscription_Renewal_Pending', label: 'Assinatura Atrasada' },
        { value: 'Refund_Period_Over', label: 'Compra Concluída (Pós-Garantia)' },
    ],
    guru: [
        { value: 'approved', label: 'Compra Aprovada' },
        { value: 'approved_order_bump', label: 'Compra Aprovada (Order Bump)' },
        { value: 'approved_upsell', label: 'Compra Aprovada (Upsell)' },
        { value: 'refused', label: 'Cartão Recusado' },
        { value: 'canceled', label: 'Compra Cancelada' },
        { value: 'refunded', label: 'Reembolso' },
        { value: 'chargeback', label: 'Chargeback' },
        { value: 'billet_printed', label: 'Boleto Gerado' },
        { value: 'expired_billet', label: 'Boleto Expirado' },
        { value: 'waiting_payment_pix', label: 'PIX Gerado' },
        { value: 'expired_pix', label: 'PIX Expirado' },
        { value: 'abandoned', label: 'Carrinho Abandonado' },
        { value: 'subscription_active', label: 'Assinatura Renovada' },
        { value: 'subscription_canceled', label: 'Assinatura Cancelada' },
        { value: 'subscription_delayed', label: 'Assinatura Atrasada' },
    ],
    herospark: [
        { value: 'PURCHASE_APPROVED', label: 'Compra Aprovada' },
        { value: 'PURCHASE_APPROVED_order_bump', label: 'Compra Aprovada (Order Bump)' },
        { value: 'PURCHASE_APPROVED_upsell', label: 'Compra Aprovada (Upsell)' },
        { value: 'PURCHASE_CANCELED_card', label: 'Cartão Recusado' },
        { value: 'PURCHASE_REFUNDED', label: 'Reembolso' },
        { value: 'PURCHASE_CHARGEBACK', label: 'Chargeback' },
        { value: 'PURCHASE_BILLET_PRINTED_boleto', label: 'Boleto Gerado' },
        { value: 'PURCHASE_BILLET_PRINTED_pix', label: 'PIX Gerado' },
        { value: 'PURCHASE_EXPIRED_boleto', label: 'Boleto Expirado' },
        { value: 'PURCHASE_EXPIRED_pix', label: 'PIX Expirado' },
        { value: 'PURCHASE_OUT_OF_SHOPPING_CART', label: 'Carrinho Abandonado' },
        { value: 'SUBSCRIPTION_RENEWED', label: 'Assinatura Renovada' },
        { value: 'SUBSCRIPTION_CANCELED', label: 'Assinatura Cancelada' },
        { value: 'PURCHASE_DELAYED', label: 'Assinatura Atrasada' },
    ],
    greenn: [
        { value: 'sale_paid', label: 'Compra Aprovada' },
        { value: 'sale_paid_order_bump', label: 'Compra Aprovada (Order Bump)' },
        { value: 'sale_paid_upsell', label: 'Compra Aprovada (Upsell)' },
        { value: 'sale_refused_card', label: 'Cartão Recusado' },
        { value: 'sale_refunded', label: 'Reembolso' },
        { value: 'sale_chargedback', label: 'Chargeback' },
        { value: 'sale_waiting_boleto', label: 'Boleto Gerado' },
        { value: 'sale_waiting_pix', label: 'PIX Gerado' },
        { value: 'sale_refused_boleto', label: 'Boleto Expirado' },
        { value: 'sale_refused_pix', label: 'PIX Expirado' },
        { value: 'lead_abandoned', label: 'Carrinho Abandonado' },
        { value: 'contract_paid', label: 'Assinatura Renovada' },
        { value: 'contract_canceled', label: 'Assinatura Cancelada' },
        { value: 'contract_unpaid', label: 'Assinatura Atrasada' },
    ],
    hubla: [
        { value: 'invoice.payment_succeeded', label: 'Compra Aprovada' },
        { value: 'invoice.payment_failed_card', label: 'Cartão Recusado' },
        { value: 'invoice.refunded', label: 'Reembolso' },
        { value: 'invoice.status_updated_chargeback', label: 'Chargeback' },
        { value: 'invoice.created_boleto', label: 'Boleto Gerado' },
        { value: 'invoice.created_pix', label: 'PIX Gerado' },
        { value: 'invoice.expired_boleto', label: 'Boleto Expirado' },
        { value: 'invoice.expired_pix', label: 'PIX Expirado' },
        { value: 'lead.abandoned_cart', label: 'Carrinho Abandonado' },
        { value: 'subscription.activated', label: 'Assinatura Renovada' },
        { value: 'subscription.deactivated', label: 'Assinatura Cancelada' },
        { value: 'subscription.expiring', label: 'Assinatura Atrasada' },
    ],
    elementor: [
        { value: 'form_submission_flat', label: 'Formulário (fields[x][value])' },
        { value: 'form_submission_simple', label: 'Formulário (name/email/phone simples)' },
        { value: 'form_submission_nested', label: 'Formulário (fields aninhado WP)' },
    ],
    pagtrust: [
        { value: 'approved', label: 'Compra Aprovada' },
        { value: 'approved_order_bump', label: 'Compra Aprovada (Order Bump)' },
        { value: 'refused', label: 'Cartão Recusado (Crédito)' },
        { value: 'refused_pix', label: 'PIX Expirado' },
        { value: 'canceled', label: 'Cancelada' },
        { value: 'refunded', label: 'Reembolso' },
        { value: 'chargeback', label: 'Chargeback' },
        { value: 'pending_boleto', label: 'Boleto Gerado' },
        { value: 'pending_pix', label: 'PIX Gerado' },
        { value: 'abandoned_cart', label: 'Carrinho Abandonado' },
    ],
    zapgroup: [
        { value: 'lead_extraido', label: 'Lead Extraído de Grupo' },
    ],
};

export function generateWebhookPayload(platform, eventType, index) {
    const i = index + 1;
    const ddd = '11';
    const phoneNum = `9${String(90000 + i).padStart(8, '0')}`;
    const phone = `+55${ddd}${phoneNum}`;
    const email = `teste.contato${i}@example.com`;
    const name = `Contato Teste ${i}`;
    const ts = Math.floor(Date.now() / 1000);

    switch (platform?.toLowerCase()) {
        case 'kirvano': {
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
            // Remove undefined keys
            return JSON.parse(JSON.stringify(base));
        }
        case 'hotmart':
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
        case 'kiwify': {
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
            // waiting_payment_boleto / waiting_payment_pix são frontend-only;
            // o backend da Kiwify usa order_status: 'waiting_payment' + payment_method
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
        case 'eduzz': {
            // Nutror (evento de aluno)
            if (eventType === 'nutror_aluno') {
                return {
                    event: 'nutror.subscription',
                    data: {
                        learner: { name, email, phone },
                        course: { title: 'Produto Scale Test', id: '999001' }
                    }
                };
            }
            // OB variant
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
            // Orbita format (formato moderno)
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
        case 'ticto': {
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
        case 'pepper': {
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
        case 'braip': {
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
            // PIX no braip vem como event='billet' + payment_method='pix'
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
        case 'monetizze': {
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
        case 'cakto': {
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
        case 'elementor':
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
            // form_submission_flat (padrão Elementor)
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
        case 'pagtrust': {
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
                : eventType; // approved, refused, canceled, refunded, chargeback
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
        case 'lastlink': {
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
        case 'guru': {
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
                    : (isOB || isUpsell) ? 'approved' : eventType; // approved, refused, canceled, refunded, chargeback, abandoned

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

            // Se for Order Bump, adicionamos a lista products no plural
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
        case 'herospark': {
            // Suffixes _card / _boleto / _pix / _order_bump / _upsell drive behavior
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
            const priceVal = isOB ? 29700 : isUpsell ? 49700 : 19700; // centavos

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

            // Order Bump: campo "bump" com produtos extras + purchaseBumpUsed: true
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

            // Upsell: campo "upsell" indicando que foi uma compra pós-venda
            if (isUpsell) {
                basePayload.upsell = true;
            }

            return basePayload;
        }
        case 'greenn': {
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

            // sale event
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
                    amount: isOB ? 294 : isUpsell ? 497 : 197, // total
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

            // Order Bump: array products com principal + bump
            if (isOB) {
                payloadOut.products = [
                    {
                        id: i,
                        name: 'Produto Scale Test',
                        amount: 197,
                        is_order_bump: false,
                    },
                    {
                        id: i + 100,
                        name: 'Produto Order Bump',
                        amount: 97,
                        is_order_bump: true,
                    }
                ];
            } else {
                payloadOut.products = [
                    {
                        id: i,
                        name: isUpsell ? 'Produto Upsell Premium' : 'Produto Scale Test',
                        amount: isUpsell ? 497 : 197,
                        is_order_bump: false,
                    }
                ];
            }

            return payloadOut;
        }
        case 'hubla': {
            // Strip suffixes used in PLATFORM_EVENT_OPTIONS (_card, _boleto, _pix, _chargeback)
            const hublaTypeParts = eventType.split('_');
            const hublaSuffix = hublaTypeParts[hublaTypeParts.length - 1]; // pix, boleto, card, chargeback
            const hublaBase = eventType
                .replace(/_card$/, '')
                .replace(/_boleto$/, '')
                .replace(/_pix$/, '')
                .replace(/_chargeback$/, '');

            const isPix = hublaSuffix === 'pix';
            const isBoleto = hublaSuffix === 'boleto';
            const isCard = hublaSuffix === 'card' || (!isPix && !isBoleto && !['lead.abandoned_cart', 'subscription.activated', 'subscription.deactivated', 'subscription.expiring'].includes(hublaBase));
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
        default:
            return {
                event: eventType,
                contact: { name, email, phone },
                product: { name: 'Produto Scale Test' },
                timestamp: new Date().toISOString()
            };
        case 'zapgroup':
            return {
                nome: phone,
                grupo: 'Grupo Lancamento Teste',
                numero: phone,
                grupo_jid: '120363405673797894@g.us',
                extraido_em: new Date().toISOString()
            };
    }
}

export function useStressTest(onStartSuccess) {
  const { user } = useAuth();
  const { activeClient } = useClient();
// Form inputs
  const [testType, setTestType] = useState(() => localStorage.getItem('stress_test_type') || 'funnel'); // 'funnel' | 'template' | 'webhook'
  const [funnelId, setFunnelId] = useState(() => localStorage.getItem('stress_test_funnel_id') || '');
  const [templateName, setTemplateName] = useState(() => localStorage.getItem('stress_test_template_name') || 'welcome_message');
  const [numberOfContacts, setNumberOfContacts] = useState(() => localStorage.getItem('stress_test_contacts') ? parseInt(localStorage.getItem('stress_test_contacts')) : 100);
  const [delaySeconds, setDelaySeconds] = useState(() => localStorage.getItem('stress_test_delay') ? parseInt(localStorage.getItem('stress_test_delay')) : 0);
  const [concurrencyLimit, setConcurrencyLimit] = useState(() => localStorage.getItem('stress_test_concurrency') ? parseInt(localStorage.getItem('stress_test_concurrency')) : 5);
  const [simulateRateLimit, setSimulateRateLimit] = useState(() => localStorage.getItem('stress_test_simulate_rl') === 'true');
  const [pricingCategory, setPricingCategory] = useState(() => localStorage.getItem('stress_test_pricing_category') || 'marketing'); // 'marketing' | 'utility'
  const [interactionFunnelId, setInteractionFunnelId] = useState(() => localStorage.getItem('stress_test_interaction_funnel_id') || '');
  const [blockFunnelId, setBlockFunnelId] = useState(() => localStorage.getItem('stress_test_block_funnel_id') || '');

  const ALL_ERRORS = [
    "(#132015) O template está temporariamente indisponível para uso porque foi pausado devido à baixa qualidade.",
    "Erro Meta 131049: Esta mensagem não foi entregue para manter o engajamento saudável do ecossistema.",
    "Erro Meta 131026: Mensagem não entregável",
    "(#2) Serviço temporariamente indisponível (Erro do Servidor da Meta)",
    "(#131000) Algo deu errado (Erro do Servidor da Meta)",
    "Lista de Exclusão (Bloqueado)"
  ];
  const [selectedErrors, setSelectedErrors] = useState(() => {
      const saved = localStorage.getItem('stress_test_selected_errors');
      if (!saved) return ALL_ERRORS;
      try {
          const parsed = JSON.parse(saved);
          return parsed.map(err => {
              if (err.includes("132015")) return ALL_ERRORS[0];
              if (err.includes("131049")) return ALL_ERRORS[1];
              if (err.includes("131026")) return ALL_ERRORS[2];
              if (err.includes("(#2)") || err.includes("Service temporarily")) return ALL_ERRORS[3];
              if (err.includes("131000") || err.includes("Something went wrong")) return ALL_ERRORS[4];
              return err;
          });
      } catch (e) {
          return ALL_ERRORS;
      }
  });

  // ─── Contacts import test state ─────────────────────────────────────────────
  const [contactsCount, setContactsCount] = useState(() => {
      const s = localStorage.getItem('stress_test_contacts_count');
      return s ? parseInt(s) : 500;
  });
  const [contactsTagCount, setContactsTagCount] = useState(() => {
      const s = localStorage.getItem('stress_test_contacts_tag_count');
      return s ? parseInt(s) : 3;
  });
  const [contactsImportResult, setContactsImportResult] = useState(null); // { imported, test_tag }
  const [isContactsRunning, setIsContactsRunning] = useState(false);

  // ─── Webhook test state ──────────────────────────────────────────────────────
  const [webhookIntegrations, setWebhookIntegrations] = useState([]);
  const [loadingWebhookIntegrations, setLoadingWebhookIntegrations] = useState(false);
  const [selectedIntegrationId, setSelectedIntegrationId] = useState('');
  const [webhookSelectedEvents, setWebhookSelectedEvents] = useState([]); // array of selected event values
  const [webhookCount, setWebhookCount] = useState(10);
  const [webhookConcurrency, setWebhookConcurrency] = useState(5);
  const [webhookDelayMs, setWebhookDelayMs] = useState(0);
  const [webhookTestResults, setWebhookTestResults] = useState(null);
  const [isWebhookRunning, setIsWebhookRunning] = useState(false);
  const [webhookSendEach, setWebhookSendEach] = useState(false); // true = 1 disparo por evento selecionado
  const webhookAbortRef = useRef(false);

  // List of funnels
  const [funnels, setFunnels] = useState([]);
  const [loadingFunnels, setLoadingFunnels] = useState(false);

  // Active test monitoring
  const [activeTriggerId, setActiveTriggerId] = useState(() => {
      const saved = localStorage.getItem('stress_test_active_trigger_id');
      return saved ? parseInt(saved) : null;
  });
  const [triggerDetails, setTriggerDetails] = useState(() => {
      const saved = localStorage.getItem('stress_test_trigger_details');
      return saved ? JSON.parse(saved) : null;
  });
  const [messageStats, setMessageStats] = useState(() => {
      const saved = localStorage.getItem('stress_test_message_stats');
      return saved ? JSON.parse(saved) : null;
  });
  const [recentMessages, setRecentMessages] = useState(() => {
      const saved = localStorage.getItem('stress_test_recent_messages');
      return saved ? JSON.parse(saved) : [];
  });
  const [isRunning, setIsRunning] = useState(false);

  // Reference for intervals
  const monitoringInterval = useRef(null);

  // Persist form inputs on change
  useEffect(() => {
      localStorage.setItem('stress_test_type', testType);
      localStorage.setItem('stress_test_funnel_id', funnelId);
      localStorage.setItem('stress_test_template_name', templateName);
      localStorage.setItem('stress_test_contacts', numberOfContacts.toString());
      localStorage.setItem('stress_test_delay', delaySeconds.toString());
      localStorage.setItem('stress_test_concurrency', concurrencyLimit.toString());
      localStorage.setItem('stress_test_simulate_rl', simulateRateLimit.toString());
      localStorage.setItem('stress_test_pricing_category', pricingCategory);
      localStorage.setItem('stress_test_interaction_funnel_id', interactionFunnelId);
      localStorage.setItem('stress_test_block_funnel_id', blockFunnelId);
      localStorage.setItem('stress_test_selected_errors', JSON.stringify(selectedErrors));
  }, [testType, funnelId, templateName, numberOfContacts, delaySeconds, concurrencyLimit, simulateRateLimit, pricingCategory, interactionFunnelId, blockFunnelId, selectedErrors]);

  useEffect(() => {
      localStorage.setItem('stress_test_contacts_count', contactsCount.toString());
      localStorage.setItem('stress_test_contacts_tag_count', contactsTagCount.toString());
  }, [contactsCount, contactsTagCount]);

  // Fetch webhook integrations
  useEffect(() => {
      if (!activeClient || testType !== 'webhook') return;
      const load = async () => {
          setLoadingWebhookIntegrations(true);
          try {
              const res = await fetchWithAuth(`${API_URL}/webhook-integrations`, {}, activeClient.id);
              if (res.ok) {
                  const data = await res.json();
                  setWebhookIntegrations(data);
                  if (data.length > 0 && !selectedIntegrationId) {
                      setSelectedIntegrationId(String(data[0].id));
                      // Select first event by default
                      const platform = data[0].platform?.toLowerCase();
                      const events = PLATFORM_EVENT_OPTIONS[platform];
                      if (events?.length > 0) setWebhookSelectedEvents([events[0].value]);
                  }
              }
          } catch (err) {
              toast.error("Não foi possível carregar as integrações.");
          } finally {
              setLoadingWebhookIntegrations(false);
          }
      };
      load();
  }, [activeClient, testType]);

  // When selected integration changes, reset to first event selected
  useEffect(() => {
      if (!selectedIntegrationId || !webhookIntegrations.length) return;
      const integration = webhookIntegrations.find(i => String(i.id) === String(selectedIntegrationId));
      if (!integration) return;
      const platform = integration.platform?.toLowerCase();
      const events = PLATFORM_EVENT_OPTIONS[platform];
      if (events?.length > 0) setWebhookSelectedEvents([events[0].value]);
  }, [selectedIntegrationId]);

  // Start webhook stress test (fires directly from frontend)
  const handleStartWebhookTest = async () => {
      if (!selectedIntegrationId) {
          toast.error("Selecione uma integração");
          return;
      }
      if (!webhookSelectedEvents.length) {
          toast.error("Selecione pelo menos um tipo de evento");
          return;
      }
      const integration = webhookIntegrations.find(i => String(i.id) === String(selectedIntegrationId));
      if (!integration) {
          toast.error("Integração não encontrada");
          return;
      }

      const webhookUrl = `${WEBHOOK_BASE_URL}/api/webhooks/${integration.custom_slug || integration.id}`;
      const platform = integration.platform?.toLowerCase() || 'default';

      // Build the ordered list of events to fire
      // sendEach mode: 1 disparo por evento selecionado, na ordem
      // random mode: N disparos aleatórios entre os selecionados
      const eventQueue = webhookSendEach
          ? [...webhookSelectedEvents]
          : Array.from({ length: webhookCount }, () =>
              webhookSelectedEvents[Math.floor(Math.random() * webhookSelectedEvents.length)]
            );

      const total = eventQueue.length;

      webhookAbortRef.current = false;
      setIsWebhookRunning(true);
      setWebhookTestResults({ sent: 0, success: 0, failed: 0, total, log: [] });

      let sent = 0, success = 0, failed = 0;
      const log = [];
      const BATCH = Math.max(1, Math.min(webhookConcurrency, 20));

      for (let i = 0; i < total; i += BATCH) {
          if (webhookAbortRef.current) break;

          const batchPromises = [];
          for (let j = i; j < Math.min(i + BATCH, total); j++) {
              const chosenEvent = eventQueue[j];
              const payload = generateWebhookPayload(platform, chosenEvent, j);
              payload._zapvoice_stress_test = true;
              batchPromises.push(
                  fetch(webhookUrl, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(payload)
                  })
                  .then(r => {
                      sent++;
                      if (r.ok || r.status === 200) { success++; log.push({ index: j + 1, status: r.status, ok: true, event: chosenEvent }); }
                      else { failed++; log.push({ index: j + 1, status: r.status, ok: false, event: chosenEvent }); }
                  })
                  .catch(e => {
                      sent++;
                      failed++;
                      log.push({ index: j + 1, status: 0, ok: false, event: chosenEvent, error: e.message });
                  })
              );
          }

          await Promise.all(batchPromises);
          setWebhookTestResults({ sent, success, failed, total, log: [...log] });

          if (webhookDelayMs > 0 && i + BATCH < total) {
              await new Promise(r => setTimeout(r, webhookDelayMs));
          }
      }

      setIsWebhookRunning(false);
      if (!webhookAbortRef.current) {
          toast.success(`Teste concluído: ${success} OK / ${failed} falhas`);
      }
  };

  const handleCancelWebhookTest = () => {
      webhookAbortRef.current = true;
      setIsWebhookRunning(false);
      toast("Teste de webhook interrompido.");
  };

  // Fetch active funnels
  useEffect(() => {
      const loadFunnels = async () => {
          if (!activeClient) return;
          setLoadingFunnels(true);
          try {
              const res = await fetchWithAuth(`${API_URL}/funnels`, {}, activeClient.id);
              if (res.ok) {
                  const data = await res.json();
                  setFunnels(data);
                  if (data.length > 0 && !funnelId) {
                      setFunnelId(data[0].id.toString());
                  }
              }
          } catch (err) {
              console.error("Erro ao carregar funis:", err);
              toast.error("Não foi possível carregar os funis.");
          } finally {
              setLoadingFunnels(false);
          }
      };

      loadFunnels();
  }, [activeClient]);

  // Handle monitoring loop
  useEffect(() => {
      if (activeTriggerId && activeClient) {
          setIsRunning(true);
          const fetchMonitoringData = async () => {
              try {
                  const resTrigger = await fetchWithAuth(`${API_URL}/triggers/${activeTriggerId}`, {}, activeClient.id);
                  if (resTrigger.ok) {
                      const triggerData = await resTrigger.json();
                      setTriggerDetails(triggerData);
                      localStorage.setItem('stress_test_trigger_details', JSON.stringify(triggerData));

                      if (['completed', 'failed', 'cancelled'].includes(triggerData.status)) {
                          setIsRunning(false);
                          setActiveTriggerId(null);
                          localStorage.removeItem('stress_test_active_trigger_id');
                          if (monitoringInterval.current) clearInterval(monitoringInterval.current);
                      }
                  } else {
                      setIsRunning(false);
                      setActiveTriggerId(null);
                      localStorage.removeItem('stress_test_active_trigger_id');
                      if (monitoringInterval.current) clearInterval(monitoringInterval.current);
                  }

                  // 2. Get message status list and counts
                  const resMessages = await fetchWithAuth(`${API_URL}/triggers/${activeTriggerId}/messages`, {}, activeClient.id);
                  if (resMessages.ok) {
                      const msgData = await resMessages.json();
                      setMessageStats(msgData.counts);
                      setRecentMessages(msgData.items.slice(0, 15));
                      localStorage.setItem('stress_test_message_stats', JSON.stringify(msgData.counts));
                      localStorage.setItem('stress_test_recent_messages', JSON.stringify(msgData.items.slice(0, 15)));
                  }
              } catch (err) {
                  console.error("Erro no monitoramento do teste de estresse:", err);
              }
          };

          fetchMonitoringData();
          monitoringInterval.current = setInterval(fetchMonitoringData, 2000);
      } else {
          setIsRunning(false);
      }

      return () => {
          if (monitoringInterval.current) clearInterval(monitoringInterval.current);
      };
  }, [activeTriggerId, activeClient]);

  // Start stress test (funnel / template)
  const handleStartTest = async (e) => {
      e.preventDefault();
      if (!activeClient) return;

      if (testType === 'funnel' && !funnelId) {
          toast.error("Por favor, selecione um funil para testar.");
          return;
      }
      if (testType === 'template' && !templateName.trim()) {
          toast.error("Por favor, informe o nome do template.");
          return;
      }

      const loadingToast = toast.loading("Iniciando teste de escala...");
      try {
          const payload = {
              funnel_id: testType === 'funnel' ? parseInt(funnelId) : null,
              template_name: testType === 'template' ? templateName : null,
              number_of_contacts: parseInt(numberOfContacts),
              delay_seconds: parseInt(delaySeconds),
              concurrency_limit: parseInt(concurrencyLimit),
              pricing_category: pricingCategory,
              interaction_funnel_id: (testType === 'template' && interactionFunnelId) ? parseInt(interactionFunnelId) : null,
              block_funnel_id: (testType === 'template' && blockFunnelId) ? parseInt(blockFunnelId) : null,
              simulated_error_reasons: selectedErrors
          };

          const res = await fetchWithAuth(`${API_URL}/stress-test`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
          }, activeClient.id);

          if (res.ok) {
              const data = await res.json();
              toast.success("Teste iniciado!", { id: loadingToast, duration: 3000 });

              setTriggerDetails(null);
              setMessageStats(null);
              setRecentMessages([]);
              localStorage.removeItem('stress_test_trigger_details');
              localStorage.removeItem('stress_test_message_stats');
              localStorage.removeItem('stress_test_recent_messages');

              setActiveTriggerId(data.trigger_id);
              localStorage.setItem('stress_test_active_trigger_id', data.trigger_id);
          } else {
              toast.error("Erro ao iniciar teste.", { id: loadingToast });
          }
      } catch (err) {
          toast.error("Erro ao conectar no servidor.", { id: loadingToast });
      }
  };

  // Import fake contacts into contacts DB
  const handleStartContactsTest = async (e) => {
      e.preventDefault();
      if (!activeClient) return;
      if (contactsCount <= 0 || contactsCount > 50000) {
          toast.error("Informe entre 1 e 50.000 contatos.");
          return;
      }
      setIsContactsRunning(true);
      setContactsImportResult(null);
      const loadingToast = toast.loading(`Importando ${contactsCount.toLocaleString('pt-BR')} contatos fictícios...`);
      try {
          const res = await fetchWithAuth(`${API_URL}/stress-test/contacts`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  number_of_contacts: parseInt(contactsCount),
                  number_of_random_tags: parseInt(contactsTagCount),
              }),
          }, activeClient.id);
          if (res.ok) {
              const data = await res.json();
              setContactsImportResult({ imported: data.imported, test_tag: data.test_tag });
              toast.success(`${data.imported.toLocaleString('pt-BR')} contatos importados!`, { id: loadingToast, duration: 4000 });
              // Não chama onStartSuccess aqui — a navegação para contatos é feita via onNavigateToContacts no componente
          } else {
              const err = await res.json().catch(() => ({}));
              toast.error(err.detail || 'Erro ao importar contatos.', { id: loadingToast });
          }
      } catch (err) {
          toast.error('Erro de conexão.', { id: loadingToast });
      } finally {
          setIsContactsRunning(false);
      }
  };

  // Cancel active test
  const handleCancelTest = async () => {
      if (!activeTriggerId || !activeClient) return;

      try {
          const res = await fetchWithAuth(`${API_URL}/triggers/${activeTriggerId}/cancel`, {
              method: 'POST'
          }, activeClient.id);

          if (res.ok) {
              toast.success("Teste cancelado com sucesso!");
              setIsRunning(false);
              setActiveTriggerId(null);
              localStorage.removeItem('stress_test_active_trigger_id');
          } else {
              toast.error("Erro ao cancelar teste.");
          }
      } catch (err) {
          toast.error("Erro ao conectar no servidor para cancelar.");
      }
  };

  return {
    user, activeClient,
    testType, setTestType, funnelId, setFunnelId, templateName, setTemplateName,
    numberOfContacts, setNumberOfContacts, delaySeconds, setDelaySeconds,
    concurrencyLimit, setConcurrencyLimit, simulateRateLimit, setSimulateRateLimit,
    pricingCategory, setPricingCategory, interactionFunnelId, setInteractionFunnelId,
    blockFunnelId, setBlockFunnelId, funnels, loadingFunnels,
    activeTriggerId, triggerDetails, messageStats, recentMessages, isRunning,
    handleStartTest, handleCancelTest, selectedErrors, setSelectedErrors, ALL_ERRORS,
    // Contacts import test
    contactsCount, setContactsCount,
    contactsTagCount, setContactsTagCount,
    contactsImportResult, setContactsImportResult,
    isContactsRunning,
    handleStartContactsTest,
    // Webhook
    webhookIntegrations, loadingWebhookIntegrations,
    selectedIntegrationId, setSelectedIntegrationId,
    webhookSelectedEvents, setWebhookSelectedEvents,
    webhookCount, setWebhookCount,
    webhookConcurrency, setWebhookConcurrency,
    webhookDelayMs, setWebhookDelayMs,
    webhookTestResults, setWebhookTestResults,
    isWebhookRunning,
    webhookSendEach, setWebhookSendEach,
    handleStartWebhookTest, handleCancelWebhookTest,
  };
}
