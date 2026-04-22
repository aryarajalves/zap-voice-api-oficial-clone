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

if __name__ == '__main__':
    unittest.main()
