import pytest
import models
from routers.leads_import import get_import_results

def test_get_import_results_enriches_tags(db_session):
    client = models.Client(name="Client Import Tags Test", is_active=True)
    db_session.add(client)
    db_session.commit()

    user = models.User(
        email="import_tags@test.com",
        hashed_password="hash",
        role="admin",
        client_id=client.id
    )
    db_session.add(user)
    db_session.commit()

    # Criar histórico de importação com fixed_tags
    history = models.ContactImportHistory(
        client_id=client.id,
        filename="AlunosAstrowake.csv",
        status="completed",
        total_rows=2,
        imported_rows=2,
        fixed_tags="Alunos, Astrowake"
    )
    db_session.add(history)
    db_session.commit()

    # Contato 1 tem lead cadastrado com tags no banco
    lead1 = models.WebhookLead(
        client_id=client.id,
        name="Lead Com Tags",
        phone="5511984913214",
        tags="Alunos, Astrowake, VIP"
    )
    db_session.add(lead1)

    # Resultados da linha da importação
    r1 = models.ImportRowResult(
        import_id=history.id,
        row_index=0,
        name="Lead Com Tags",
        phone="5511984913214",
        status="updated"
    )
    # Contato 2 não tem lead cadastrado ainda, mas foi importado com fixed_tags
    r2 = models.ImportRowResult(
        import_id=history.id,
        row_index=1,
        name="Lead Sem Lead No Banco",
        phone="554199687565",
        status="imported"
    )
    # Contato 3 rejeitado
    r3 = models.ImportRowResult(
        import_id=history.id,
        row_index=2,
        name="Invalido",
        phone="123",
        status="rejected_invalid_phone",
        reason="Telefone com menos de 8 digitos"
    )
    db_session.add_all([r1, r2, r3])
    db_session.commit()

    res = get_import_results(
        import_id=history.id,
        skip=0,
        limit=50,
        client_id=client.id,
        db=db_session,
        current_user=user
    )

    assert res["total"] == 3
    assert res["fixed_tags"] == "Alunos, Astrowake"
    assert len(res["items"]) == 3

    item1 = next(item for item in res["items"] if item["phone"] == "5511984913214")
    assert "VIP" in item1["tags"]

    item2 = next(item for item in res["items"] if item["phone"] == "554199687565")
    assert item2["tags"] == "Alunos, Astrowake"

    item3 = next(item for item in res["items"] if item["phone"] == "123")
    assert item3["tags"] is None
