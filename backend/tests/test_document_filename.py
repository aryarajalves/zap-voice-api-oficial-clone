import unittest
from unittest.mock import MagicMock

class TestDocumentFilenameDisplay(unittest.TestCase):
    def test_document_filename_extraction_from_meta(self):
        msg = {
            "type": "document",
            "document": {
                "id": "123456789",
                "filename": "Relatorio_Mensal_2026.pdf",
                "caption": "Segue o relatório"
            }
        }
        
        chat_meta = {}
        m_type = msg.get("type")
        media_obj = msg.get(m_type)
        if m_type == "document" and isinstance(media_obj, dict) and media_obj.get("filename"):
            chat_meta["filename"] = media_obj.get("filename")
            
        self.assertEqual(chat_meta.get("filename"), "Relatorio_Mensal_2026.pdf")

if __name__ == '__main__':
    unittest.main()
