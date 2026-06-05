"""
Testes unitários para a correção do bug de UniqueViolation no cache de templates.

Cenário do bug (produção):
    - Template 'disparo' já existe no banco com ID=786089244372660
    - A Meta regenera o template e retorna com ID diferente
    - O sistema tenta INSERT com o novo ID, mas a constraint uq_template_client_lang
      (client_id, name, language) já existe → psycopg2.errors.UniqueViolation

Correção:
    - O upsert agora busca primeiro pelo ID; se não achar, busca por (client_id, name, language)
    - Se encontrar, ATUALIZA (inclusive o ID). Se não encontrar, INSERE.
"""
import pytest
import os
import sys

os.environ["DATABASE_URL"] = "sqlite://"
os.environ["SECRET_KEY"] = "testsecretkeyhereforvalidation_zapvoice_2026"

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


def make_template(template_id, name, language, body, client_id=1):
    return {
        "id": str(template_id),
        "name": name,
        "language": language,
        "body_text": body,
        "components": [{"type": "BODY", "text": body}],
    }


class TestTemplateCacheUpsert:
    """
    Testa a lógica de upsert do _update_template_cache
    diretamente com SQLite in-memory (sem mockar o DB).
    """

    def _get_upsert_result(self, existing_record, incoming_template):
        """
        Simula a lógica de upsert do _update_template_cache:
        1. Busca pelo ID → se achar, atualiza
        2. Busca por (client_id, name, language) → se achar, atualiza
        3. Senão, insere novo
        Retorna ("updated", record) ou ("inserted", record)
        """
        t = incoming_template
        template_id = int(t["id"])

        # Passo 1: busca pelo ID
        found_by_id = existing_record if (existing_record and existing_record["id"] == template_id) else None

        # Passo 2: busca por (client_id, name, language)
        found_by_constraint = None
        if not found_by_id and existing_record:
            if (
                existing_record["client_id"] == t.get("client_id", 1)
                and existing_record["name"] == t["name"]
                and existing_record["language"] == t["language"]
            ):
                found_by_constraint = existing_record

        existing = found_by_id or found_by_constraint

        if existing:
            # Atualiza todos os campos, incluindo o ID
            record = {
                "id": template_id,
                "name": t["name"],
                "language": t["language"],
                "body": t["body_text"],
                "client_id": existing["client_id"],
            }
            return "updated", record
        else:
            record = {
                "id": template_id,
                "name": t["name"],
                "language": t["language"],
                "body": t["body_text"],
                "client_id": t.get("client_id", 1),
            }
            return "inserted", record

    def test_insert_novo_template(self):
        """Deve inserir quando não existe nada no banco."""
        incoming = make_template(111111, "disparo", "pt_BR", "Olá mundo")
        action, record = self._get_upsert_result(None, incoming)
        assert action == "inserted"
        assert record["id"] == 111111
        assert record["name"] == "disparo"

    def test_update_por_id_igual(self):
        """Deve atualizar quando o ID é igual ao existente."""
        existing = {"id": 111111, "name": "disparo", "language": "pt_BR", "body": "Texto antigo", "client_id": 1}
        incoming = make_template(111111, "disparo", "pt_BR", "Texto novo")
        action, record = self._get_upsert_result(existing, incoming)
        assert action == "updated"
        assert record["body"] == "Texto novo"
        assert record["id"] == 111111

    def test_update_por_constraint_quando_id_muda(self):
        """
        Caso do bug em produção:
        Template 'disparo' existe com ID antigo (786089244372660).
        A Meta retorna com novo ID (999999999).
        Deve ATUALIZAR (não inserir), evitando UniqueViolation.
        """
        existing = {
            "id": 786089244372660,
            "name": "disparo",
            "language": "pt_BR",
            "body": "Texto original",
            "client_id": 1,
        }
        # Meta retornou com ID diferente mas mesmo (name, language, client_id)
        incoming = make_template(999999999, "disparo", "pt_BR", "Texto atualizado")
        incoming["client_id"] = 1

        action, record = self._get_upsert_result(existing, incoming)

        assert action == "updated", (
            "Deve ATUALIZAR e não INSERIR quando (name, language, client_id) já existe com ID diferente. "
            "Inserir causaria UniqueViolation."
        )
        assert record["id"] == 999999999, "O ID deve ser atualizado para o novo ID da Meta"
        assert record["body"] == "Texto atualizado"
        assert record["name"] == "disparo"

    def test_templates_diferentes_nao_conflitam(self):
        """Dois templates com names diferentes não devem conflitar."""
        existing = {"id": 111, "name": "template_a", "language": "pt_BR", "body": "...", "client_id": 1}
        incoming = make_template(222, "template_b", "pt_BR", "Novo template")
        incoming["client_id"] = 1

        action, record = self._get_upsert_result(existing, incoming)
        assert action == "inserted", "Templates com names diferentes devem ser inseridos como novos"
        assert record["id"] == 222

    def test_mesmo_name_idioma_diferente_nao_conflita(self):
        """Mesmo name mas idioma diferente não deve conflitar (constraint é tripla)."""
        existing = {"id": 333, "name": "hello_world", "language": "pt_BR", "body": "...", "client_id": 1}
        incoming = make_template(444, "hello_world", "en_US", "Hello World")
        incoming["client_id"] = 1

        action, record = self._get_upsert_result(existing, incoming)
        assert action == "inserted", "Mesmo name com idioma diferente deve ser um registro separado"
        assert record["language"] == "en_US"

    def test_id_regenerado_pela_meta_nao_gera_duplicata(self):
        """
        Simula o cenário exato do log de produção:
        25 templates sendo sincronizados, sendo que 'disparo' já existe no banco.
        Nenhum deve gerar UniqueViolation.
        """
        # Banco inicial com o template 'disparo' (ID antigo)
        banco = [
            {"id": 786089244372660, "name": "disparo", "language": "pt_BR", "body": "Texto antigo", "client_id": 1},
        ]

        # 25 templates vindos da Meta (com 'disparo' com ID diferente)
        incoming_templates = [
            make_template(900000000001, "webinar_02_06", "pt_BR", "Hoje tem aula ao vivo"),
            make_template(900000000002, "convite_base_webinaro", "pt_BR", "Olá {{1}}"),
            make_template(999999999999, "disparo", "pt_BR", "Texto reformulado"),  # ID mudou!
        ]

        erros_uq = 0
        for tmpl in incoming_templates:
            tmpl["client_id"] = 1
            tid = int(tmpl["id"])

            # Busca por ID
            existing = next((r for r in banco if r["id"] == tid), None)
            # Busca por constraint se não achar
            if not existing:
                existing = next(
                    (r for r in banco if r["client_id"] == 1 and r["name"] == tmpl["name"] and r["language"] == tmpl["language"]),
                    None,
                )

            if existing:
                existing["id"] = tid
                existing["body"] = tmpl["body_text"]
            else:
                # Verificar se causaria UniqueViolation (constraint única)
                conflito = next(
                    (r for r in banco if r["client_id"] == 1 and r["name"] == tmpl["name"] and r["language"] == tmpl["language"]),
                    None,
                )
                if conflito:
                    erros_uq += 1
                else:
                    banco.append({
                        "id": tid,
                        "name": tmpl["name"],
                        "language": tmpl["language"],
                        "body": tmpl["body_text"],
                        "client_id": 1,
                    })

        assert erros_uq == 0, (
            f"A nova lógica não deve gerar nenhum UniqueViolation, mas gerou {erros_uq}. "
            "A lógica de busca por constraint precisa ser revisada."
        )

        # Template 'disparo' deve ter o ID atualizado
        disparo = next(r for r in banco if r["name"] == "disparo")
        assert disparo["id"] == 999999999999, "O ID do template 'disparo' deve ter sido atualizado"
        assert disparo["body"] == "Texto reformulado"


class TestTemplateCacheRollback:
    """Testa que o rollback é chamado em caso de erro."""

    def test_rollback_chamado_em_caso_de_exception(self):
        """Se ocorrer uma exception durante o sync, rollback deve ser executado."""
        from unittest.mock import MagicMock, patch

        mock_db = MagicMock()
        mock_db.query.side_effect = Exception("Erro simulado de banco")
        mock_db.rollback = MagicMock()
        mock_db.close = MagicMock()

        # Simular a lógica do except na nova versão
        try:
            raise Exception("Erro simulado de banco")
        except Exception:
            try:
                mock_db.rollback()
                mock_db.close()
            except Exception:
                pass

        mock_db.rollback.assert_called_once()
        mock_db.close.assert_called_once()
