
"""
test_33_delete_email_history.py
Testes unitários para exclusão de itens do histórico de disparos de e-mail.
"""

import sys
import os
import pytest
from unittest.mock import MagicMock, patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))


class TestDeleteEmailHistory:
    def test_delete_dispatch_existente_sucesso(self):
        """Devolve mensagem de sucesso ao deletar um registro existente."""
        mock_dispatch = MagicMock()
        mock_dispatch.id = 10
        mock_dispatch.client_id = 1

        mock_db = MagicMock()
        mock_db.query.return_value.filter_by.return_value.first.return_value = mock_dispatch

        from routers.email_marketing import delete_email_dispatch

        user = MagicMock()
        user.client_id = 1

        res = delete_email_dispatch(dispatch_id=10, x_client_id=1, db=mock_db, current_user=user)

        assert res["status"] == "success"
        mock_db.delete.assert_called_once_with(mock_dispatch)
        mock_db.commit.assert_called_once()

    def test_delete_dispatch_inexistente_retorna_404(self):
        """Retorna HTTPException 404 quando o disparo não existe no banco."""
        from fastapi import HTTPException
        mock_db = MagicMock()
        mock_db.query.return_value.filter_by.return_value.first.return_value = None

        from routers.email_marketing import delete_email_dispatch

        user = MagicMock()
        user.client_id = 1

        with pytest.raises(HTTPException) as exc_info:
            delete_email_dispatch(dispatch_id=999, x_client_id=1, db=mock_db, current_user=user)

        assert exc_info.value.status_code == 404
        assert "não encontrado" in exc_info.value.detail
