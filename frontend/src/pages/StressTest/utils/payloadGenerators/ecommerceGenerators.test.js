import { describe, it, expect } from 'vitest';
import {
    generateKirvanoPayload,
    generateHotmartPayload,
    generateKiwifyPayload,
    generateEduzzPayload,
    generateTictoPayload,
    generatePepperPayload,
    generateBraipPayload,
    generateMonetizzePayload,
    generateCaktoPayload,
    generateLastlinkPayload
} from './ecommerceGenerators';

describe('Modularização de ecommerceGenerators', () => {
    describe('Kirvano Payload Generator', () => {
        it('deve gerar payload de compra aprovada simples e com order bump', () => {
            const simple = generateKirvanoPayload('SALE_APPROVED', 0);
            expect(simple.event).toBe('SALE_APPROVED');
            expect(simple.status).toBe('APPROVED');
            expect(simple.payment_method).toBe('CREDIT_CARD');
            expect(simple.total_price).toBe('R$ 169,80');
            expect(simple.products).toHaveLength(1);

            const ob = generateKirvanoPayload('SALE_APPROVED_OB', 0);
            expect(ob.event).toBe('SALE_APPROVED');
            expect(ob.total_price).toBe('R$ 196,80');
            expect(ob.products).toHaveLength(2);
            expect(ob.products[1].is_order_bump).toBe(true);
        });

        it('deve gerar payload para boleto e pix com campos específicos', () => {
            const boleto = generateKirvanoPayload('BANK_SLIP_GENERATED', 1);
            expect(boleto.payment_method).toBe('BANK_SLIP');
            expect(boleto.payment.barcode).toBeDefined();

            const pix = generateKirvanoPayload('PIX_GENERATED', 2);
            expect(pix.payment_method).toBe('PIX');
            expect(pix.payment.qrcode).toBeDefined();
        });
    });

    describe('Hotmart Payload Generator', () => {
        it('deve gerar payload padrão e com order bump', () => {
            const normal = generateHotmartPayload('PURCHASE_APPROVED', 0);
            expect(normal.event).toBe('PURCHASE_APPROVED');
            expect(normal.data.purchase.price.value).toBe(169.80);
            expect(normal.data.purchase.is_order_bump).toBe(false);

            const ob = generateHotmartPayload('PURCHASE_APPROVED_OB', 0);
            expect(ob.event).toBe('PURCHASE_APPROVED');
            expect(ob.data.purchase.is_order_bump).toBe(true);
            expect(ob.data.product.name).toContain('Bônus');
        });
    });

    describe('Kiwify Payload Generator', () => {
        it('deve tratar order bump e métodos de pagamento boleto/pix', () => {
            const ob = generateKiwifyPayload('paid_ob', 0);
            expect(ob.order_status).toBe('paid');
            expect(ob.OrderBumps).toHaveLength(1);

            const boleto = generateKiwifyPayload('waiting_payment_boleto', 0);
            expect(boleto.order_status).toBe('waiting_payment');
            expect(boleto.payment_method).toBe('billet');

            const pix = generateKiwifyPayload('waiting_payment_pix', 0);
            expect(pix.order_status).toBe('waiting_payment');
            expect(pix.payment_method).toBe('pix');
        });
    });

    describe('Eduzz Payload Generator', () => {
        it('deve formatar eventos nutror, order bump e pedidos comuns', () => {
            const nutror = generateEduzzPayload('nutror_aluno', 0);
            expect(nutror.event).toBe('nutror.subscription');
            expect(nutror.data.learner).toBeDefined();

            const bump = generateEduzzPayload('paid_with_bump', 0);
            expect(bump.data.items).toHaveLength(2);
            expect(bump.data.price.value).toBe(124.00);

            const boleto = generateEduzzPayload('waiting_payment_boleto', 0);
            expect(boleto.data.paymentMethod).toBe('boleto');
        });
    });

    describe('Ticto, Pepper e Braip Generators', () => {
        it('deve gerar payload da Ticto com order bump e status condicional', () => {
            const tictoOb = generateTictoPayload('purchase.approved_ob', 0);
            expect(tictoOb.order.order_bumps).toHaveLength(1);
            expect(tictoOb.order.total_price).toBe(124.00);

            const tictoPix = generateTictoPayload('purchase.waiting_pix', 0);
            expect(tictoPix.order.payment_method).toBe('pix');
        });

        it('deve gerar payload da Pepper com order bump e métodos de pagamento', () => {
            const pepperOb = generatePepperPayload('PURCHASE_APPROVED_OB', 0);
            expect(pepperOb.data.order_bumps).toHaveLength(1);

            const pepperPix = generatePepperPayload('PIX_GENERATED', 0);
            expect(pepperPix.data.transaction.payment_method).toBe('pix');
        });

        it('deve gerar payload da Braip com order bump e formatos boleto/pix', () => {
            const braipOb = generateBraipPayload('approved_ob', 0);
            expect(braipOb.order_bump).toBeDefined();

            const braipPix = generateBraipPayload('billet_pix', 0);
            expect(braipPix.payment_method).toBe('pix');
            expect(braipPix.event).toBe('billet');
        });
    });

    describe('Monetizze, Cakto e Lastlink Generators', () => {
        it('deve gerar payload da Monetizze mapeando status e upsell', () => {
            const ob = generateMonetizzePayload('approved_ob', 0);
            expect(ob.type).toBe('upsell');

            const pix = generateMonetizzePayload('pix', 0);
            expect(pix.status.id).toBe(21);
            expect(pix.payment_method.name).toBe('PIX');
        });

        it('deve gerar payload da Cakto com order bump e status calculado', () => {
            const ob = generateCaktoPayload('order.paid_ob', 0);
            expect(ob.data.order.order_bumps).toHaveLength(1);

            const pix = generateCaktoPayload('order.pix_generated', 0);
            expect(pix.data.order.payment_method).toBe('pix');
        });

        it('deve gerar payload da Lastlink com suporte a upsell, boleto e assinaturas', () => {
            const upsell = generateLastlinkPayload('Purchase_Order_Confirmed_Upsell', 0);
            expect(upsell.Event).toBe('Purchase_Order_Confirmed');
            expect(upsell.Data.Purchase.IsUpsell).toBe(true);

            const pix = generateLastlinkPayload('Order_Pix', 0);
            expect(upsell.Data.Buyer).toBeDefined();
            expect(pix.Data.Purchase.Payment.PaymentMethod).toBe('pix');
        });
    });
});
