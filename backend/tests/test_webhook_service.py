import unittest
from services.webhooks import parse_webhook_payload

class TestWebhookService(unittest.TestCase):
    def test_hotmart_purchase_approved(self):
        payload = {
            "event": "PURCHASE_APPROVED",
            "data": {
                "buyer": {
                    "name": "João Silva",
                    "email": "joao@example.com",
                    "checkout_phone": "5511999999999"
                },
                "product": {
                    "name": "Curso de Python"
                },
                "purchase": {
                    "status": "APPROVED",
                    "is_order_bump": False,
                    "payment": {"type": "CREDIT_CARD"}
                }
            }
        }
        result = parse_webhook_payload("hotmart", payload)
        self.assertEqual(result["event_type"], "compra_aprovada")
        self.assertEqual(result["product_name"], "Curso de Python")
        self.assertFalse(result["order_bump"])

    def test_hotmart_order_bump(self):
        payload = {
            "event": "PURCHASE_APPROVED",
            "data": {
                "buyer": {"name": "Test"},
                "product": {"name": "Ebook Bonus"},
                "purchase": {
                    "is_order_bump": True
                }
            }
        }
        result = parse_webhook_payload("hotmart", payload)
        self.assertTrue(result["order_bump"])

    def test_kiwify_paid(self):
        payload = {
            "order_status": "paid",
            "Customer": {
                "full_name": "Maria Souza",
                "email": "maria@example.com",
                "mobile": "5511888888888"
            },
            "Product": {
                "product_name": "Mentoria Express"
            },
            "payment_method": "pix",
            "Commissions": {
                "charge_amount": 29900,
                "currency": "BRL"
            }
        }
        result = parse_webhook_payload("kiwify", payload)
        self.assertEqual(result["event_type"], "compra_aprovada")
        self.assertEqual(result["product_name"], "Mentoria Express")
        self.assertEqual(result["price"], "299.00")

if __name__ == "__main__":
    unittest.main()
