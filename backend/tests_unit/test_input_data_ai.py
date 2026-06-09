import unittest
from unittest.mock import AsyncMock, MagicMock, patch
import httpx
from services.input_data_parser import parse_and_extract_input_data, generate_ai_error_message

class TestInputDataParserAI(unittest.IsolatedAsyncioTestCase):
    
    def setUp(self):
        self.db = MagicMock()
        self.trigger = MagicMock()
        self.trigger.client_id = 1
        
    @patch("services.input_data_parser.get_setting")
    async def test_traditional_parser_cpf_success(self, mock_setting):
        node_data = {
            "collectionType": "traditional",
            "validationRule": "cpf",
            "varName": "cpf"
        }
        user_input = "O meu cpf é 05010030305"
        
        is_valid, extracted = await parse_and_extract_input_data(
            self.db, user_input, node_data, 1, self.trigger
        )
        
        self.assertTrue(is_valid)
        self.assertEqual(extracted, "05010030305")

    @patch("services.input_data_parser.get_setting")
    async def test_traditional_parser_cpf_invalid(self, mock_setting):
        node_data = {
            "collectionType": "traditional",
            "validationRule": "cpf",
            "varName": "cpf"
        }
        user_input = "O meu cpf é 12345"  # Inválido, não tem 11 dígitos
        
        is_valid, extracted = await parse_and_extract_input_data(
            self.db, user_input, node_data, 1, self.trigger
        )
        
        self.assertFalse(is_valid)
        self.assertEqual(extracted, "O meu cpf é 12345")

    @patch("services.input_data_parser.get_setting")
    @patch("httpx.AsyncClient.post")
    async def test_ai_parser_success(self, mock_post, mock_setting):
        # Configurar Mocks
        mock_setting.side_effect = lambda key, default, client_id: {
            "OPENAI_API_KEY": "fake_key",
            "OPENAI_API_MODEL": "gpt-4o-mini"
        }.get(key, default)
        
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "choices": [
                {
                    "message": {
                        "content": '{"is_valid": true, "extracted_value": "05010030305"}'
                     }
                }
            ]
        }
        mock_post.return_value = mock_resp
        
        node_data = {
            "collectionType": "ai",
            "aiInstructions": "Extraia apenas os números do CPF",
            "varName": "cpf"
        }
        user_input = "O meu cpf é 050.100.303-05"
        
        is_valid, extracted = await parse_and_extract_input_data(
            self.db, user_input, node_data, 1, self.trigger
        )
        
        self.assertTrue(is_valid)
        self.assertEqual(extracted, "05010030305")
        mock_post.assert_called_once()

    @patch("services.input_data_parser.get_setting")
    @patch("httpx.AsyncClient.post")
    async def test_ai_parser_no_key(self, mock_post, mock_setting):
        # OpenAI key vazia
        mock_setting.return_value = ""
        
        node_data = {
            "collectionType": "ai",
            "aiInstructions": "Extraia o CPF",
            "varName": "cpf"
        }
        user_input = "O meu cpf é 05010030305"
        
        is_valid, extracted = await parse_and_extract_input_data(
            self.db, user_input, node_data, 1, self.trigger
        )
        
        self.assertFalse(is_valid)
        self.assertEqual(extracted, "O meu cpf é 05010030305")
        mock_post.assert_not_called()

    @patch("services.input_data_parser.get_setting")
    @patch("httpx.AsyncClient.post")
    async def test_generate_ai_error_message_success(self, mock_post, mock_setting):
        # Configurar Mocks
        mock_setting.side_effect = lambda key, default, client_id: {
            "OPENAI_API_KEY": "fake_key",
            "OPENAI_API_MODEL": "gpt-4o-mini"
        }.get(key, default)
        
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "choices": [
                {
                    "message": {
                        "content": "Ops! Esse CPF não parece válido. Digite os 11 números novamente."
                    }
                }
            ]
        }
        mock_post.return_value = mock_resp
        
        node_data = {
            "collectionType": "traditional",
            "validationRule": "cpf",
            "varName": "cpf",
            "errorMessage": "CPF inválido."
        }
        user_input = "invalido"
        
        error_msg = await generate_ai_error_message(user_input, node_data, 1)
        self.assertEqual(error_msg, "Ops! Esse CPF não parece válido. Digite os 11 números novamente.")
        mock_post.assert_called_once()

    @patch("services.input_data_parser.get_setting")
    @patch("httpx.AsyncClient.post")
    async def test_generate_ai_error_message_no_key(self, mock_post, mock_setting):
        # OpenAI key vazia
        mock_setting.return_value = ""
        
        node_data = {
            "collectionType": "traditional",
            "validationRule": "cpf",
            "varName": "cpf",
            "errorMessage": "CPF inválido."
        }
        user_input = "invalido"
        
        error_msg = await generate_ai_error_message(user_input, node_data, 1)
        self.assertEqual(error_msg, "CPF inválido.")
        mock_post.assert_not_called()
