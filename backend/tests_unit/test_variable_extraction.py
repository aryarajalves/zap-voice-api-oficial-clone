import sys
import os
import unittest

# Adicionar o diretório backend ao path para poder importar os serviços
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from services.webhooks import extract_mapped_variables

class TestVariableExtraction(unittest.TestCase):
    def setUp(self):
        self.payload = {
            "id": "12345",
            "customer": {
                "name": "João Silva",
                "email": "joao@example.com"
            },
            "product": {
                "name": "Curso de Python",
                "price": 97.50
            },
            "payment": {
                "method": "pix"
            }
        }
        self.parsed_data = {
            "name": "João Silva",
            "phone": "5511999999999",
            "email": "joao@example.com",
            "product_name": "Curso de Python"
        }

    def test_legacy_dict_format(self):
        # Formato antigo: {"1": "name", "2": "product_name"}
        mapping_config = {"1": "name", "2": "product_name"}
        result = extract_mapped_variables(self.payload, self.parsed_data, mapping_config)
        
        # Esperado: [{"type": "body", "parameters": [{"type": "text", "text": "João Silva"}, {"type": "text", "text": "Curso de Python"}]}]
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["type"], "body")
        self.assertEqual(len(result[0]["parameters"]), 2)
        self.assertEqual(result[0]["parameters"][0]["text"], "João Silva")
        self.assertEqual(result[0]["parameters"][1]["text"], "Curso de Python")

    def test_new_list_format_simple(self):
        # Novo formato: lista de objetos
        mapping_config = [
            {"key": "1", "value": "name", "type": "body"},
            {"key": "2", "value": "product_name", "type": "body"}
        ]
        result = extract_mapped_variables(self.payload, self.parsed_data, mapping_config)
        
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["type"], "body")
        self.assertEqual(len(result[0]["parameters"]), 2)
        self.assertEqual(result[0]["parameters"][0]["text"], "João Silva")
        self.assertEqual(result[0]["parameters"][1]["text"], "Curso de Python")

    def test_new_list_format_custom_path(self):
        # Novo formato com extração dinâmica de path
        mapping_config = [
            {"key": "1", "value": "custom", "custom_value": "customer.name", "type": "body"},
            {"key": "2", "value": "custom", "custom_value": "product.price", "type": "body"},
            {"key": "3", "value": "custom", "custom_value": "payment.method", "type": "body"}
        ]
        result = extract_mapped_variables(self.payload, self.parsed_data, mapping_config)
        
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["type"], "body")
        self.assertEqual(len(result[0]["parameters"]), 3)
        self.assertEqual(result[0]["parameters"][0]["text"], "João Silva")
        self.assertEqual(result[0]["parameters"][1]["text"], "97.5")
        self.assertEqual(result[0]["parameters"][2]["text"], "pix")

    def test_new_list_format_custom_fixed_value(self):
        # Novo formato com valor fixo (não é path e não existe no payload)
        mapping_config = [
            {"key": "1", "value": "custom", "custom_value": "Valor Fixo Legal", "type": "body"}
        ]
        result = extract_mapped_variables(self.payload, self.parsed_data, mapping_config)
        
        self.assertEqual(result[0]["parameters"][0]["text"], "Valor Fixo Legal")

    def test_header_media_variable(self):
        # Variável de Header (Mídia)
        mapping_config = [
            {"key": "1", "value": "custom", "custom_value": "https://example.com/image.png", "type": "header"}
        ]
        result = extract_mapped_variables(self.payload, self.parsed_data, mapping_config, header_format="IMAGE")
        
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["type"], "header")
        self.assertEqual(result[0]["parameters"][0]["type"], "image")
        self.assertEqual(result[0]["parameters"][0]["image"]["link"], "https://example.com/image.png")

    def test_missing_path(self):
        # Path que não existe
        mapping_config = [
            {"key": "1", "value": "custom", "custom_value": "non_existent.path", "type": "body"}
        ]
        result = extract_mapped_variables(self.payload, self.parsed_data, mapping_config)
        self.assertEqual(result[0]["parameters"][0]["text"], "-")

if __name__ == '__main__':
    unittest.main()
