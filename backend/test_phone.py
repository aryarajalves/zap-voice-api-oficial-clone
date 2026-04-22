import sys
import os
import unittest
from unittest.mock import MagicMock

# Mock logger before import
import logging
logger = logging.getLogger("test")

# Import logic to test
# We need to test the logic inside parse_webhook_payload (not directly exported as a single function, but logic is in routers/webhooks_public.py)
# Since we can't easily import the router without all dependencies, let's extract the phone logic to a testable function or verify it via a small script.

def normalize_phone(phone):
    cleaned = ''.join(filter(str.isdigit, str(phone)))
    
    # 1. Add country code if missing (assumes BR if <= 11 digits)
    if not cleaned.startswith("55") and len(cleaned) <= 11:
        cleaned = "55" + cleaned
        
    # 2. BR Phone Normalization (The "9-digit" fix)
    if cleaned.startswith("55") and len(cleaned) == 12:
        ddd = cleaned[2:4]
        number = cleaned[4:]
        cleaned = f"55{ddd}9{number}"
        
    return cleaned

class TestPhoneNormalization(unittest.TestCase):
    def test_br_phone_12_digits(self):
        # 55 + 85 + 8 digits = 12 digits
        input_phone = "558596123586"
        expected = "5585996123586" # Injected 9
        self.assertEqual(normalize_phone(input_phone), expected)

    def test_br_phone_13_digits(self):
        # 55 + 85 + 9 + 8 digits = 13 digits
        input_phone = "5585996123586"
        expected = "5585996123586" # Keep as is
        self.assertEqual(normalize_phone(input_phone), expected)

    def test_no_country_code(self):
        input_phone = "8596123586" # 10 digits
        # Steps: 
        # 1. Add 55 -> 558596123586 (12 digits)
        # 2. Inject 9 -> 5585996123586 (13 digits)
        expected = "5585996123586"
        self.assertEqual(normalize_phone(input_phone), expected)

if __name__ == "__main__":
    unittest.main()
