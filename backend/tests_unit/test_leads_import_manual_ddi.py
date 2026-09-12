import pytest
import os
import sys
import json
import io
import pandas as pd
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from fastapi import UploadFile, BackgroundTasks

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import models
from database import Base
from routers.leads_import.parsers import (
    _decompose_and_build_phone,
    _build_phone_series,
    _build_phone_components,
    _clean_phone_digits,
    _clean_ddi_val,
)
from routers.leads_import import execute_import


TEST_DATABASE_URL = "sqlite://"
engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture
def db():
    Base.metadata.create_all(bind=engine)
    import database
    original_session_local = database.SessionLocal
    database.SessionLocal = TestingSessionLocal
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        database.SessionLocal = original_session_local
        Base.metadata.drop_all(bind=engine)


@pytest.fixture
def mock_user():
    return models.User(id=1, email="test@example.com", role="admin", client_id=1)


def test_decompose_and_build_phone_unit():
    """Testa decomposição e montagem inteligente com DDI manual 55."""
    # 1. 11 dígitos sem DDI -> deve adicionar 55
    ddi, ddd, num, full = _decompose_and_build_phone("", "11947260688", "", "55")
    assert ddi == "55"
    assert ddd == ""
    assert num == "11947260688"
    assert full == "5511947260688"

    # 2. 13 dígitos já começando com 55 -> NÃO deve duplicar 55
    ddi, ddd, num, full = _decompose_and_build_phone("", "5511947260688", "", "55")
    assert ddi == "55"
    assert ddd == ""
    assert num == "11947260688"
    assert full == "5511947260688"

    # 3. Número do RS com DDD 55 (11 dígitos, sem DDI) -> deve adicionar DDI 55
    ddi, ddd, num, full = _decompose_and_build_phone("", "55981112233", "", "55")
    assert ddi == "55"
    assert ddd == ""
    assert num == "55981112233"
    assert full == "5555981112233"

    # 4. Número do RS com 13 dígitos (já com DDI 55) -> NÃO deve duplicar
    ddi, ddd, num, full = _decompose_and_build_phone("", "5555981112233", "", "55")
    assert ddi == "55"
    assert ddd == ""
    assert num == "55981112233"
    assert full == "5555981112233"

    # 5. Coluna DDD separada
    ddi, ddd, num, full = _decompose_and_build_phone("11", "947260688", "", "55")
    assert ddi == "55"
    assert ddd == "11"
    assert num == "947260688"
    assert full == "5511947260688"

    # 6. Coluna DDI com nome do país
    ddi, ddd, num, full = _decompose_and_build_phone("", "11947260688", "Brasil", "")
    assert ddi == "55"
    assert full == "5511947260688"

    # 7. Float com .0
    ddi, ddd, num, full = _decompose_and_build_phone("", "11947260688.0", "", "55")
    assert ddi == "55"
    assert num == "11947260688"
    assert full == "5511947260688"


def test_build_phone_series_composite_with_manual_ddi():
    """Testa a geração da série do Pandas no modo composto com DDI manual."""
    df = pd.DataFrame({
        "Telefone": ["11947260688", "5511979694272", "55981112233", "5555981112233"]
    })
    mapping = {
        "mode": "composite",
        "number_column": "Telefone",
        "manual_ddi": "55"
    }
    series = _build_phone_series(df, mapping)
    assert series.tolist() == [
        "5511947260688",
        "5511979694272",
        "5555981112233",
        "5555981112233"
    ]


def test_build_phone_components_preview():
    """Testa os componentes visuais gerados para o modal de prévia."""
    df = pd.DataFrame({
        "Telefone": ["11947260688", "5511979694272"]
    })
    mapping = {
        "mode": "composite",
        "number_column": "Telefone",
        "manual_ddi": "55"
    }
    ddi_s, ddd_s, num_s = _build_phone_components(df, mapping)
    assert ddi_s.tolist() == ["55", "55"]
    assert ddd_s.tolist() == ["", ""]
    assert num_s.tolist() == ["11947260688", "11979694272"]


@pytest.mark.asyncio
async def test_end_to_end_import_with_manual_ddi(db: Session, mock_user: models.User):
    """Testa fluxo completo de importação com mapeamento composto e DDI manual 55."""
    project = models.Project(id=1, name="Projeto Teste")
    db.add(project)
    client = models.Client(id=1, name="Cliente 1", project_id=1)
    db.add(client)
    db.commit()

    csv_content = (
        "Nome;Telefone WatsApp com DDD\n"
        "Priscila;11947260688\n"
        "Manoela;5511979694272\n"
        "Silvana;55981112233\n"
    )
    file = UploadFile(filename="contatos.csv", file=io.BytesIO(csv_content.encode('utf-8')))
    mapping = json.dumps({
        "name": "Nome",
        "phone": {
            "mode": "composite",
            "ddi_column": "",
            "ddd_column": "",
            "number_column": "Telefone WatsApp com DDD",
            "manual_ddi": "55"
        }
    })

    background_tasks = BackgroundTasks()
    res = await execute_import(
        background_tasks=background_tasks,
        file=file,
        mapping=mapping,
        client_id=1,
        db=db,
        current_user=mock_user
    )
    assert res["status"] == "success"

    for task in background_tasks.tasks:
        task.func(*task.args, **task.kwargs)

    leads = db.query(models.WebhookLead).all()
    lead_phones = {l.name: l.phone for l in leads}

    assert lead_phones["Priscila"] == "5511947260688"
    assert lead_phones["Manoela"] == "5511979694272"
    assert lead_phones["Silvana"] == "5555981112233"


def test_detect_international_and_ddi_overrides():
    """Valida detecção de números internacionais (ex: Portugal 351) e overrides manuais de DDI."""
    # 1. Beatris de Portugal com 351932457372 e DDI manual 55 -> NÃO deve adicionar 55 por padrão!
    ddi, ddd, num, full = _decompose_and_build_phone("", "351932457372", "", "55")
    assert ddi == "351"
    assert num == "932457372"
    assert full == "351932457372"

    # 2. Número internacional com force_apply_ddi=True -> Força a adição do 55
    ddi, ddd, num, full = _decompose_and_build_phone("", "351932457372", "", "55", force_apply_ddi=True)
    assert ddi == "55"
    assert full == "55351932457372"

    # 3. Número brasileiro com force_apply_ddi=False -> Remove o DDI 55
    ddi, ddd, num, full = _decompose_and_build_phone("", "31996111818", "", "55", force_apply_ddi=False)
    assert ddi == ""
    assert num == "31996111818"
    assert full == "31996111818"

    # 4. DataFrame com lista mista e ddi_overrides em _build_phone_series
    df = pd.DataFrame({
        "Telefone": ["31996111818", "351932457372", "11988887777"]
    })
    mapping = {
        "mode": "composite",
        "number_column": "Telefone",
        "manual_ddi": "55",
        "ddi_overrides": {
            "0": False,  # Remove DDI do primeiro contato (brasileiro)
            "1": False,  # Mantém sem 55 o português
            "2": True    # Mantém com 55 o brasileiro
        }
    }
    series = _build_phone_series(df, mapping)
    assert series.tolist() == [
        "31996111818",     # DDI removido
        "351932457372",    # Portugal sem 55
        "5511988887777"    # DDI 55 aplicado
    ]

