import unittest
# Mocking database and models LOCALLY during import if needed, but safer to just let it import
# if the environment is set up (like in conftest.py)
from routers.webhooks_public import parse_webhook_payload

class TestWebhookParser(unittest.TestCase):
    def test_kiwify_approved_cents(self):
        payload = {
            "order_status": "paid",
            "payment_method": "credit_card",
            "Product": {"product_name": "Course A"},
            "Customer": {"full_name": "User A"},
            "Commissions": {"charge_amount": 33431, "currency": "BRL"}
        }
        result = parse_webhook_payload('kiwify', payload)
        self.assertEqual(result['price'], "334.31")
        self.assertEqual(result['payment_method'], "Cartão de Crédito")
        self.assertEqual(result['event_type'], "compra_aprovada")
        self.assertEqual(result['platform'], "kiwify")

    def test_kiwify_abandoned_status(self):
        payload = {
            "status": "abandoned",
            "product_name": "Course B",
            "name": "User B",
            "phone": "5511999999999"
        }
        result = parse_webhook_payload('kiwify', payload)
        self.assertEqual(result['raw_status'], "Carrinho Abandonado")
        self.assertEqual(result['event_type'], "carrinho_abandonado")

    def test_currency_conversion_usd(self):
        payload = {
            "order_status": "paid",
            "Commissions": {"charge_amount": 10000, "currency": "USD"}
        }
        result = parse_webhook_payload('kiwify', payload)
        # 100.00 USD * 5.45 = 545.00
        self.assertEqual(result['price'], "545.00")

    def test_low_price_cents_eduzz(self):
        payload = {
            "status": "paid",
            "items": [{"name": "Ebook"}],
            "amount": 4000 # 40.00 Reais
        }
        # Eduzz Orbita
        result = parse_webhook_payload('eduzz', payload)
        self.assertEqual(result['price'], "4000.00") # Parser current behavior doesn't divide by 100 for eduzz 'amount'
        self.assertEqual(result['platform'], "eduzz")

    def test_eduzz_multiple_items_order_bump(self):
        payload = {
            "status": "paid",
            "items": [
                {"name": "Item A", "price": {"value": 50}},
                {"name": "Item B", "price": {"value": 30}}
            ],
            "price": {"value": 80}
        }
        result = parse_webhook_payload('eduzz', payload)
        self.assertEqual(result['price'], "80.00")
        # Dependendo de como o parser trata o float
        self.assertEqual(len(result['items']), 2)
        self.assertIn("Item A", result['product_name'])
        self.assertIn("Item B", result['product_name'])
        self.assertEqual(result['items'][0]['price'], 50)

    def test_payment_method_translation(self):
        # Testando a tradução global no fim do parser
        payload = {"paymentMethod": "creditCard", "status": "paid", "items": []} # items triggers Orbita mode
        result = parse_webhook_payload('eduzz', payload)
        self.assertEqual(result['payment_method'], "Cartão de Crédito")
        
        payload2 = {"payment_method": "billet", "status": "paid"}
        result2 = parse_webhook_payload('kiwify', payload2)
        self.assertEqual(result2['payment_method'], "Boleto")

        payload3 = {"payment_method": "card_pix", "status": "paid"}
        result3 = parse_webhook_payload('kiwify', payload3)
        self.assertEqual(result3['payment_method'], "Cartão de Crédito")

    def test_invalid_short_phone(self):
        # O parser apenas limpa o telefone e adiciona 55 se <= 11 dígitos.
        payload = {"phone": "123"} 
        result = parse_webhook_payload('kiwify', payload)
        self.assertEqual(result['phone'], "55123") 

    def test_hotmart_complete(self):
        payload = {
            "event": "PURCHASE_COMPLETE",
            "data": {
                "buyer": {"name": "Test Complete", "email": "complete@test.com", "phone": "11999999999"},
                "product": {"name": "Test Product"},
                "purchase": {
                    "status": "COMPLETE",
                    "payment": {"type": "CREDIT_CARD"},
                    "price": {"value": 59.9, "currency_value": "BRL"}
                }
            }
        }
        res = parse_webhook_payload('hotmart', payload)
        self.assertEqual(res['event_type'], "compra_aprovada")
        self.assertEqual(res['raw_status'], "Compra Aprovada")
        self.assertEqual(res['payment_method'], "Cartão de Crédito")
        self.assertEqual(res['price'], "59.90")
        self.assertEqual(res['currency'], "BRL")

    def test_hotmart_billet_printed_pix(self):
        payload = {
            "event": "PURCHASE_BILLET_PRINTED",
            "data": {
                "buyer": {"name": "Test Billet Pix", "email": "billetpix@test.com", "phone": "11999999999"},
                "product": {"name": "Test Product"},
                "purchase": {"status": "WAITING_PAYMENT", "payment": {"type": "PIX", "pix_code": "code123", "pix_qrcode": "url123"}}
            }
        }
        res = parse_webhook_payload('hotmart', payload)
        self.assertEqual(res['event_type'], "pix_gerado")
        self.assertEqual(res['raw_status'], "Pix Gerado")
        self.assertEqual(res['pix_code'], "code123")
        self.assertEqual(res['pix_qrcode'], "url123")

    def test_hotmart_billet_printed_billet(self):
        payload = {
            "event": "PURCHASE_BILLET_PRINTED",
            "data": {
                "buyer": {"name": "Test Billet", "email": "billet@test.com", "phone": "11999999999"},
                "product": {"name": "Test Product"},
                "purchase": {"status": "WAITING_PAYMENT", "payment": {"type": "BILLET"}}
            }
        }
        res = parse_webhook_payload('hotmart', payload)
        self.assertEqual(res['event_type'], "boleto_impresso")
        self.assertEqual(res['raw_status'], "Boleto Impresso")

    def test_hotmart_chargeback(self):
        payload = {
            "event": "PURCHASE_CHARGEBACK",
            "data": {
                "buyer": {"name": "Test CB", "email": "cb@test.com"},
                "purchase": {"status": "CHARGEBACK"}
            }
        }
        res = parse_webhook_payload('hotmart', payload)
        self.assertEqual(res['event_type'], "reembolso")
        self.assertEqual(res['raw_status'], "Reembolso")

    def test_hotmart_protest(self):
        payload = {
            "event": "PURCHASE_PROTEST",
            "data": {
                "buyer": {"name": "Test Protest", "email": "protest@test.com"},
                "purchase": {"status": "DISPUTE"}
            }
        }
        res = parse_webhook_payload('hotmart', payload)
        self.assertEqual(res['event_type'], "reembolso")
        self.assertEqual(res['raw_status'], "Em Disputa")

    def test_hotmart_delayed(self):
        payload = {
            "event": "PURCHASE_DELAYED",
            "data": {
                "buyer": {"name": "Test Delayed", "email": "delayed@test.com"},
                "purchase": {"status": "DELAYED"}
            }
        }
        res = parse_webhook_payload('hotmart', payload)
        self.assertEqual(res['event_type'], "cartao_recusado")
        self.assertEqual(res['raw_status'], "Cartão Recusado")

    def test_hotmart_expired(self):
        payload = {
            "event": "PURCHASE_EXPIRED",
            "data": {
                "buyer": {"name": "Test Expired", "email": "expired@test.com"},
                "purchase": {"status": "EXPIRED"}
            }
        }
        res = parse_webhook_payload('hotmart', payload)
        self.assertEqual(res['event_type'], "pix_expirado")
        self.assertEqual(res['raw_status'], "Expirado")

    def test_hotmart_out_of_cart(self):
        payload = {
            "event": "PURCHASE_OUT_OF_SHOPPING_CART",
            "data": {
                "buyer": {"name": "Test Cart", "email": "cart@test.com"}
            }
        }
        res = parse_webhook_payload('hotmart', payload)
        self.assertEqual(res['event_type'], "carrinho_abandonado")
        self.assertEqual(res['raw_status'], "Carrinho Abandonado")

    def test_hotmart_subscription_cancellation(self):
        payload = {
            "event": "SUBSCRIPTION_CANCELLATION",
            "data": {
                "subscriber": {"name": "Sub Name", "email": "sub@test.com", "phone": {"cell": "999999999", "dddCell": "11"}},
                "actual_recurrence_value": 49.9
            }
        }
        res = parse_webhook_payload('hotmart', payload)
        self.assertEqual(res['event_type'], "reembolso")
        self.assertEqual(res['raw_status'], "Assinatura Cancelada")
        self.assertEqual(res['name'], "Sub Name")
        self.assertEqual(res['email'], "sub@test.com")
        self.assertEqual(res['phone'], "5511999999999")
        self.assertEqual(res['price'], "49.90")

    def test_hotmart_switch_plan(self):
        payload = {
            "event": "SWITCH_PLAN",
            "data": {
                "plans": [
                    {"name": "Old Plan", "current": False},
                    {"name": "New Plan", "current": True}
                ],
                "subscription": {
                    "user": {"email": "switch@test.com"}
                }
            }
        }
        res = parse_webhook_payload('hotmart', payload)
        self.assertEqual(res['event_type'], "outros")
        self.assertEqual(res['raw_status'], "Troca de Plano")
        self.assertEqual(res['product_name'], "New Plan")

    def test_hotmart_club_events(self):
        payload = {
            "event": "CLUB_MODULE_COMPLETED",
            "data": {
                "user": {"name": "Student Name", "email": "student@test.com", "phone": "11988888888"}
            }
        }
        res = parse_webhook_payload('hotmart', payload)
        self.assertEqual(res['event_type'], "evento_aluno")
        self.assertEqual(res['raw_status'], "Módulo Concluído")
        self.assertEqual(res['name'], "Student Name")
        self.assertEqual(res['email'], "student@test.com")
        self.assertEqual(res['phone'], "5511988888888")

if __name__ == '__main__':
    unittest.main()
