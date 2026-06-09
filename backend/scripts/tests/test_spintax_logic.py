import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

import unittest
from core.engine.utils import apply_vars
import models

class DummyTrigger:
    def __init__(self):
        self.contact_name = "Aryaraj Alves"
        self.contact_phone = "5585999999999"
        self.product_name = "Curso ZapVoice"
        self.template_components = None

class TestSpintaxParser(unittest.TestCase):
    def setUp(self):
        self.trigger = DummyTrigger()
        self.global_map = {}

    def test_single_spintax_options(self):
        text = "{Oi|Olá|Bom dia}, tudo bem?"
        resolved = apply_vars(text, self.trigger, self.global_map)
        
        # O resultado final deve conter uma das três opções
        possible_starts = ["Oi, tudo bem?", "Olá, tudo bem?", "Bom dia, tudo bem?"]
        self.assertIn(resolved, possible_starts)

    def test_multiple_spintax_options(self):
        text = "{Oi|Olá}, {tudo bem|como vai}?"
        resolved = apply_vars(text, self.trigger, self.global_map)
        
        possible_results = [
            "Oi, tudo bem?",
            "Oi, como vai?",
            "Olá, tudo bem?",
            "Olá, como vai?"
        ]
        self.assertIn(resolved, possible_results)

    def test_no_spintax_normal_text(self):
        text = "Oi, tudo bem? Seu produto {{produto}} está pronto."
        resolved = apply_vars(text, self.trigger, self.global_map)
        
        self.assertEqual(resolved, "Oi, tudo bem? Seu produto Curso ZapVoice está pronto.")

if __name__ == "__main__":
    unittest.main()
