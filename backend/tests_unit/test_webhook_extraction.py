
import sys
import os
import unittest
from unittest.mock import MagicMock

# Setup path and mocks
sys.path.append(os.path.join(os.getcwd(), "backend"))
sys.modules['database'] = MagicMock()
sys.modules['models'] = MagicMock()
sys.modules['schemas'] = MagicMock()
sys.modules['core.deps'] = MagicMock()
sys.modules['core.logger'] = MagicMock()
sys.modules['rabbitmq_client'] = MagicMock()

from services.webhooks import parse_webhook_payload as parse_service
from routers.webhooks_public import parse_webhook_payload as parse_public

class TestWebhookExtraction(unittest.TestCase):
    def setUp(self):
        self.payload = {
            "Nome": "Marcos Vinicius",
            "Telefone": "31983260370",
            "E-mail": "vinykvinte@hotmail.com",
            "form_name": "Consori"
        }

    def test_service_parser_capitalized_keys(self):
        result = parse_service("Elementor", self.payload)
        self.assertEqual(result["name"], "Marcos Vinicius")
        # Service parser extracts but doesn't add 55/9th digit prefix like the public router does
        self.assertEqual(result["phone"], "31983260370") 
        self.assertEqual(result["email"], "vinykvinte@hotmail.com")

    def test_public_parser_capitalized_keys(self):
        result = parse_public("Elementor", self.payload)
        self.assertEqual(result["name"], "Marcos Vinicius")
        self.assertEqual(result["phone"], "5531983260370") # Normalized
        self.assertEqual(result["email"], "vinykvinte@hotmail.com")

    def test_service_parser_email_alternate(self):
        # Test with Email (no hyphen)
        payload = {"Email": "test@example.com"}
        result = parse_service("Elementor", payload)
        self.assertEqual(result["email"], "test@example.com")

    def test_public_parser_email_alternate(self):
        payload = {"Email": "test@example.com"}
        result = parse_public("Elementor", payload)
        self.assertEqual(result["email"], "test@example.com")

if __name__ == "__main__":
    unittest.main()
