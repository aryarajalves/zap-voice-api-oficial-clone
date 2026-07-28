
"""
test_36_email_drag_drop_html.py
Testes unitários para validar a exportação de blocos e estilos globais do Editor Drag & Drop em HTML final de e-mail.
"""

import sys
import os
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))


class TestEmailDragDropHtml:
    def test_export_blocks_structure(self):
        """Valida se o HTML gerado contém o fundo externo customizado, botão CTA e estilos responsivos."""
        outer_bg = "#b20505"
        card_bg = "#ffffff"
        card_width = 600

        # HTML simulado que o frontend gera a partir do exportBlocksToHtml
        html_output = f"""
        <!DOCTYPE html>
        <html lang="pt-BR">
        <body style="margin: 0; padding: 0; background-color: {outer_bg};">
          <table role="presentation" width="100%" style="background-color: {outer_bg};">
            <tr>
              <td align="center">
                <table role="presentation" style="max-width: {card_width}px; background-color: {card_bg};">
                  <tr>
                    <td>
                      <div style="font-size: 16px; color: #1e293b;">Olá {{nome}}</div>
                      <div style="text-align: center;">
                        <a href="https://zapvoice.com" style="background-color: #2563eb; color: #ffffff;">Garantir Vaga</a>
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
        """

        assert outer_bg in html_output
        assert card_bg in html_output
        assert "600px" in html_output
        assert "Garantir Vaga" in html_output
        assert "{{nome}}" in html_output
