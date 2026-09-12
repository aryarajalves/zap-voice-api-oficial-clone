import os
import io
import csv
from typing import Optional, List
from datetime import datetime, timezone
import pandas as pd

IMPORT_FILES_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "static", "imports")
os.makedirs(IMPORT_FILES_DIR, exist_ok=True)

# Lógica de DDI: se o número já possuir DDI (ex: 55 com 12+ dígitos), não duplica.
# Caso contrário, aplica o DDI manual/da coluna (ex: 55). Números com DDD 55 do RS
# (10 ou 11 dígitos) recebem o DDI 55 normalmente.

COUNTRY_TO_DDI = {
    "brasil": "55",
    "brazil": "55",
    "br": "55",
    "portugal": "351",
    "pt": "351",
    "estados unidos": "1",
    "united states": "1",
    "eua": "1",
    "usa": "1",
    "us": "1",
    "espanha": "34",
    "spain": "34",
    "es": "34",
    "emirados árabes unidos": "971",
    "emirados arabes unidos": "971",
    "uae": "971",
    "itália": "39",
    "italia": "39",
    "italy": "39",
    "it": "39",
    "austrália": "61",
    "australia": "61",
    "au": "61",
    "romênia": "40",
    "romenia": "40",
    "romania": "40",
    "ro": "40",
    "guatemala": "502",
    "gt": "502",
    "frança": "33",
    "franca": "33",
    "france": "33",
    "fr": "33",
    "canadá": "1",
    "canada": "1",
    "ca": "1",
    "suíça": "41",
    "suica": "41",
    "switzerland": "41",
    "ch": "41",
    "holanda": "31",
    "paises baixos": "31",
    "netherlands": "31",
    "nl": "31",
    "argentina": "54",
    "ar": "54",
    "chile": "56",
    "cl": "56",
    "uruguai": "598",
    "uruguay": "598",
    "uy": "598",
    "colômbia": "57",
    "colombia": "57",
    "co": "57",
    "méxico": "52",
    "mexico": "52",
    "mx": "52",
    "angola": "244",
    "ao": "244",
    "moçambique": "258",
    "mocambique": "258",
    "mozambique": "258",
    "mz": "258",
    "japão": "81",
    "japao": "81",
    "japan": "81",
    "jp": "81",
    "alemanha": "49",
    "germany": "49",
    "de": "49",
    "reino unido": "44",
    "united kingdom": "44",
    "uk": "44",
    "gb": "44",
}


def fix_mojibake(text: str) -> str:
    """Corrige nomes com encoding quebrado (UTF-8 lido como Latin-1).
    Ex: 'RogÃ©rio' → 'Rogério'
    """
    if not text or not isinstance(text, str):
        return text
    try:
        return text.encode("latin-1").decode("utf-8")
    except (UnicodeDecodeError, UnicodeEncodeError):
        return text


def normalize_name(text: str) -> str:
    """Corrige encoding e aplica Title Case no nome.
    Ex: 'ALBERTO LEVI esquivel acuna' → 'Alberto Levi Esquivel Acuna'
    """
    if not text or not isinstance(text, str):
        return text
    fixed = fix_mojibake(text)
    return fixed.strip().title()


def detect_csv_delimiter(content: bytes) -> str:
    """Detecta automaticamente o separador mais provável do CSV (; , \\t |)."""
    sample_bytes = content[:16384]
    sample_text = ""
    for enc in ("utf-8-sig", "utf-8", "cp1252", "latin-1"):
        try:
            sample_text = sample_bytes.decode(enc)
            break
        except Exception:
            continue
    if not sample_text:
        return ";"

    lines = [l for l in sample_text.splitlines() if l.strip()][:15]
    if not lines:
        return ";"

    # 1. Tentar csv.Sniffer padrão da biblioteca Python
    try:
        dialect = csv.Sniffer().sniff(sample_text[:4096], delimiters=";,|\t")
        if dialect.delimiter in (";", ",", "\t", "|"):
            return dialect.delimiter
    except Exception:
        pass

    # 2. Heurística robusta por consistência de colunas nas primeiras linhas
    candidates = [";", ",", "\t", "|"]
    scores = {}
    for sep in candidates:
        row_counts = [l.count(sep) for l in lines]
        if not row_counts or max(row_counts) == 0:
            continue
        header_count = row_counts[0]
        if header_count == 0:
            continue
        consistent_lines = sum(1 for c in row_counts if c == header_count)
        consistency_ratio = consistent_lines / len(row_counts)
        scores[sep] = (consistency_ratio, header_count)

    if scores:
        best_sep = max(scores.keys(), key=lambda s: (scores[s][0], scores[s][1]))
        if scores[best_sep][0] >= 0.4:
            return best_sep

    # 3. Fallback por frequência total
    counts = {sep: sample_text.count(sep) for sep in candidates}
    best = max(counts, key=counts.get)
    return best if counts[best] > 0 else ";"


def read_csv_smart(content: bytes, sep: Optional[str] = None) -> pd.DataFrame:
    """Lê CSV com blindagem total contra quebras de formatação:
    - Detecta automaticamente o separador real da planilha (; , \\t |).
    - Suporta múltiplos encodings (utf-8-sig, utf-8, cp1252, latin-1).
    - Trata linhas com pontuações soltas ou campos anômalos (on_bad_lines='skip').
    - Fallback para engine='python' em arquivos com aspas mal formatadas.
    - Garante index_col=False e dtype=str para não corromper números e zeros à esquerda.
    """
    detected_sep = detect_csv_delimiter(content)
    candidate_seps = []
    if sep and sep.strip():
        candidate_seps.append(sep)
    if detected_sep not in candidate_seps:
        candidate_seps.append(detected_sep)
    for s in (";", ",", "\t", "|"):
        if s not in candidate_seps:
            candidate_seps.append(s)

    encodings = ("utf-8-sig", "utf-8", "cp1252", "latin-1")

    # 1. Tentativa rápida padrão com on_bad_lines='skip'
    for s in candidate_seps:
        for enc in encodings:
            try:
                df = pd.read_csv(
                    io.BytesIO(content),
                    sep=s,
                    encoding=enc,
                    index_col=False,
                    on_bad_lines='skip',
                    dtype=str
                )
                if len(df.columns) > 1 and len(df) > 0:
                    return df
            except Exception:
                continue

    # 2. Tentativa tolerante com engine='python' (mais permissivo com aspas e pontuações soltas)
    for s in candidate_seps:
        for enc in encodings:
            try:
                df = pd.read_csv(
                    io.BytesIO(content),
                    sep=s,
                    encoding=enc,
                    index_col=False,
                    on_bad_lines='skip',
                    engine='python',
                    dtype=str
                )
                if len(df.columns) > 1 and len(df) > 0:
                    return df
            except Exception:
                continue

    # 3. Tentativa para arquivos de 1 coluna (ex: arquivo só com coluna de telefone)
    for s in candidate_seps:
        try:
            df = pd.read_csv(
                io.BytesIO(content),
                sep=s,
                encoding="latin-1",
                index_col=False,
                on_bad_lines='skip',
                dtype=str
            )
            if len(df) > 0:
                return df
        except Exception:
            continue

    # Fallback seguro absoluto — nunca lança exceção não tratada
    return pd.read_csv(
        io.BytesIO(content),
        sep=candidate_seps[0] if candidate_seps else ";",
        encoding="latin-1",
        index_col=False,
        on_bad_lines='skip',
        engine='python',
        dtype=str
    )


def _parse_datetime_smart(val) -> Optional[datetime]:
    """Converte valores de data/hora (string, Timestamp ou número) para datetime consciente de fuso horário.
    Suporta formatos comuns em português e ISO:
    - '06/08/2026 15:53:15', '06/08/2026 15:53', '06/08/2026'
    - '2026-08-06 15:53:15', '2026-08-06T15:53:15', '2026-08-06'
    """
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return None
    
    if isinstance(val, (datetime, pd.Timestamp)):
        dt = val.to_pydatetime() if isinstance(val, pd.Timestamp) else val
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    
    s = str(val).strip()
    if not s or s.lower() in ('nan', 'none', 'null', '', '-'):
        return None

    # 1. Tenta formatos explícitos conhecidos primeiro para evitar ambiguidade (ex: YYYY-MM-DD vs DD/MM/YYYY)
    formats = [
        "%d/%m/%Y %H:%M:%S",
        "%d/%m/%Y %H:%M",
        "%d/%m/%Y",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%d %H:%M",
        "%Y-%m-%d",
    ]
    for fmt in formats:
        try:
            dt = datetime.strptime(s, fmt)
            return dt.replace(tzinfo=timezone.utc)
        except ValueError:
            continue

    # 2. Fallback via pd.to_datetime
    try:
        ts = pd.to_datetime(s, dayfirst=True, errors='coerce')
        if not pd.isna(ts):
            dt = ts.to_pydatetime()
            return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    except Exception:
        pass

    return None


def _split_tags(s) -> List[str]:
    """Divide string de tags em lista, suportando JSON array ou vírgulas."""
    if not s:
        return []
    val = str(s).strip()
    if val.startswith('[') and val.endswith(']'):
        try:
            import json as _j
            parsed = _j.loads(val)
            if isinstance(parsed, list):
                return [str(t).strip() for t in parsed if str(t).strip()]
        except Exception:
            pass
    cleaned = val.replace('[', '').replace(']', '').replace('"', '').replace("'", "")
    return [t.strip() for t in cleaned.split(",") if t.strip()]


import re


def _clean_phone_digits(v) -> str:
    """Extrai só os dígitos de um valor de célula (trata NaN/None, floats e sufixo .0)."""
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return ""
    if isinstance(v, float) and v.is_integer():
        v = int(v)
    s = str(v).strip()
    s = re.sub(r'\.0+$', '', s)
    return "".join(filter(str.isdigit, s))


def _clean_ddi_val(v) -> str:
    """
    Extrai o DDI de um valor de célula.
    Se for o nome de um país, converte para o DDI numérico.
    Caso contrário, extrai somente os dígitos do número.
    """
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return ""
    
    val_str = str(v).strip().lower()
    if val_str in COUNTRY_TO_DDI:
        return COUNTRY_TO_DDI[val_str]
    
    if isinstance(v, float) and v.is_integer():
        v = int(v)
    s = str(v).strip()
    s = re.sub(r'\.0+$', '', s)
    return "".join(filter(str.isdigit, s))


VALID_BRAZIL_DDDS = {
    "11", "12", "13", "14", "15", "16", "17", "18", "19",
    "21", "22", "24", "27", "28",
    "31", "32", "33", "34", "35", "37", "38",
    "41", "42", "43", "44", "45", "46", "47", "48", "49",
    "51", "53", "54", "55",
    "61", "62", "63", "64", "65", "66", "67", "68", "69",
    "71", "73", "74", "75", "77", "79",
    "81", "82", "83", "84", "85", "86", "87", "88", "89",
    "91", "92", "93", "94", "95", "96", "97", "98", "99"
}

INTERNATIONAL_DDI_INFO = {
    "351": {"country": "Portugal", "flag": "🇵🇹"},
    "1": {"country": "EUA / Canadá", "flag": "🇺🇸"},
    "34": {"country": "Espanha", "flag": "🇪🇸"},
    "39": {"country": "Itália", "flag": "🇮🇹"},
    "33": {"country": "França", "flag": "🇫🇷"},
    "44": {"country": "Reino Unido", "flag": "🇬🇧"},
    "49": {"country": "Alemanha", "flag": "🇩🇪"},
    "54": {"country": "Argentina", "flag": "🇦🇷"},
    "56": {"country": "Chile", "flag": "🇨🇱"},
    "57": {"country": "Colômbia", "flag": "🇨🇴"},
    "52": {"country": "México", "flag": "🇲🇽"},
    "598": {"country": "Uruguai", "flag": "🇺🇾"},
    "595": {"country": "Paraguai", "flag": "🇵🇾"},
    "591": {"country": "Bolívia", "flag": "🇧🇴"},
    "51": {"country": "Peru", "flag": "🇵🇪"},
    "244": {"country": "Angola", "flag": "🇦🇴"},
    "258": {"country": "Moçambique", "flag": "🇲🇿"},
    "81": {"country": "Japão", "flag": "🇯🇵"},
    "971": {"country": "Emirados Árabes", "flag": "🇦🇪"},
    "41": {"country": "Suíça", "flag": "🇨🇭"},
    "31": {"country": "Holanda", "flag": "🇳🇱"},
    "61": {"country": "Austrália", "flag": "🇦🇺"},
}


def _detect_phone_origin(ddd_val, num_val, raw_ddi_val) -> dict:
    """
    Detecta se o telefone é brasileiro ou internacional com base no formato e DDI.
    Retorna: {
        "is_brazilian": bool,
        "country": str,
        "flag": str,
        "detected_ddi": str
    }
    """
    clean_raw_ddi = _clean_ddi_val(raw_ddi_val) if raw_ddi_val else ""
    clean_ddd = _clean_phone_digits(ddd_val)
    clean_num = _clean_phone_digits(num_val)

    if clean_raw_ddi:
        if clean_raw_ddi == "55":
            return {"is_brazilian": True, "country": "Brasil", "flag": "🇧🇷", "detected_ddi": "55"}
        info = INTERNATIONAL_DDI_INFO.get(clean_raw_ddi)
        if info:
            return {"is_brazilian": False, "country": info["country"], "flag": info["flag"], "detected_ddi": clean_raw_ddi}
        return {"is_brazilian": False, "country": f"DDI +{clean_raw_ddi}", "flag": "🌍", "detected_ddi": clean_raw_ddi}

    raw_str = str(num_val or "").strip()
    is_explicit_plus = raw_str.startswith("+")

    if not clean_num:
        return {"is_brazilian": True, "country": "Brasil", "flag": "🇧🇷", "detected_ddi": "55"}

    # Se começou explicitamente com '+' no arquivo e não foi +55, é internacional:
    if is_explicit_plus:
        if clean_num.startswith("55") and len(clean_num) in (12, 13):
            return {"is_brazilian": True, "country": "Brasil", "flag": "🇧🇷", "detected_ddi": "55"}
        for ddi, info in sorted(INTERNATIONAL_DDI_INFO.items(), key=lambda x: -len(x[0])):
            if clean_num.startswith(ddi):
                return {"is_brazilian": False, "country": info["country"], "flag": info["flag"], "detected_ddi": ddi}
        return {"is_brazilian": False, "country": "Internacional", "flag": "🌍", "detected_ddi": ""}

    # Se tem 12 ou 13 dígitos e começa com 55:
    if clean_num.startswith("55") and len(clean_num) in (12, 13):
        return {"is_brazilian": True, "country": "Brasil", "flag": "🇧🇷", "detected_ddi": "55"}

    # Se tem 12 ou mais dígitos e NÃO começa com 55:
    # No Brasil não existe número de 12+ dígitos sem DDI. Portanto, é 100% internacional!
    if len(clean_num) >= 12 and not clean_num.startswith("55"):
        for ddi, info in sorted(INTERNATIONAL_DDI_INFO.items(), key=lambda x: -len(x[0])):
            if clean_num.startswith(ddi):
                return {"is_brazilian": False, "country": info["country"], "flag": info["flag"], "detected_ddi": ddi}
        return {"is_brazilian": False, "country": "Internacional", "flag": "🌍", "detected_ddi": ""}

    # Se tem 11 dígitos:
    if len(clean_num) == 11:
        ddd_cand = clean_num[:2]
        is_br_mobile = (ddd_cand in VALID_BRAZIL_DDDS) and (clean_num[2] == '9')
        if is_br_mobile:
            return {"is_brazilian": True, "country": "Brasil", "flag": "🇧🇷", "detected_ddi": "55"}
        # EUA/Canadá: 11 dígitos começando com 1
        if clean_num.startswith("1"):
            return {"is_brazilian": False, "country": "EUA / Canadá", "flag": "🇺🇸", "detected_ddi": "1"}

    # Se tem 10 dígitos:
    if len(clean_num) == 10:
        ddd_cand = clean_num[:2]
        if ddd_cand in VALID_BRAZIL_DDDS and clean_num[2] in ('2', '3', '4', '5'):
            return {"is_brazilian": True, "country": "Brasil", "flag": "🇧🇷", "detected_ddi": "55"}

    # Se tem DDD separado e é brasileiro:
    if clean_ddd and clean_ddd in VALID_BRAZIL_DDDS:
        return {"is_brazilian": True, "country": "Brasil", "flag": "🇧🇷", "detected_ddi": "55"}

    # Padrão para números de 8 a 11 dígitos:
    if len(clean_num) in (8, 9, 10, 11):
        return {"is_brazilian": True, "country": "Brasil", "flag": "🇧🇷", "detected_ddi": "55"}

    return {"is_brazilian": False, "country": "Internacional", "flag": "🌍", "detected_ddi": ""}


def _decompose_and_build_phone(
    ddd_val,
    num_val,
    raw_ddi_val,
    manual_ddi,
    force_apply_ddi: Optional[bool] = None
) -> tuple[str, str, str, str]:
    """
    Decompõe e constrói o telefone resolvendo DDI, DDD e Número com validação de país.
    Retorna: (ddi, ddd, number, full_phone)
    """
    ddd_clean = _clean_phone_digits(ddd_val)
    num_clean = _clean_phone_digits(num_val)
    ddi_clean = _clean_ddi_val(raw_ddi_val) if raw_ddi_val else _clean_ddi_val(manual_ddi)

    if not num_clean and not ddd_clean:
        return (ddi_clean, "", "", "")

    origin = _detect_phone_origin(ddd_val, num_val, raw_ddi_val)
    is_brazilian = origin["is_brazilian"]

    # Determina se deve aplicar o DDI
    if force_apply_ddi is not None:
        apply_ddi = force_apply_ddi
    else:
        # Se for internacional, NÃO aplica acréscimo de 55 por padrão
        if not is_brazilian and ddi_clean == "55":
            apply_ddi = False
        else:
            apply_ddi = bool(ddi_clean)

    # Se NÃO deve aplicar o DDI (desmarcado ou internacional sem DDI forçado):
    if not apply_ddi:
        detected_ddi = origin.get("detected_ddi") or ""
        if detected_ddi and num_clean.startswith(detected_ddi) and len(num_clean) >= len(detected_ddi) + 6:
            remainder = num_clean[len(detected_ddi):]
            return (detected_ddi, ddd_clean, remainder, num_clean)
        if ddi_clean == "55" and num_clean.startswith("55") and len(num_clean) >= 12:
            remainder = num_clean[2:]
            return ("", ddd_clean, remainder, f"{ddd_clean}{remainder}")
        base = f"{ddd_clean}{num_clean}"
        return ("", ddd_clean, num_clean, base)

    # Caso apply_ddi == True:
    # Se num_clean já começa com ddi_clean e é um número completo já com DDI:
    if ddi_clean == "55":
        if num_clean.startswith("55") and len(num_clean) >= 12:
            remainder = num_clean[2:]
            if ddd_clean and remainder.startswith(ddd_clean):
                return ("55", ddd_clean, remainder[len(ddd_clean):], num_clean)
            elif ddd_clean:
                return ("55", ddd_clean, remainder, num_clean)
            else:
                return ("55", "", remainder, num_clean)
    elif ddi_clean:
        if num_clean.startswith(ddi_clean) and len(num_clean) >= len(ddi_clean) + 8:
            remainder = num_clean[len(ddi_clean):]
            return (ddi_clean, ddd_clean, remainder, num_clean)

    base = f"{ddd_clean}{num_clean}"

    if ddi_clean == "55":
        if base.startswith("55") and len(base) >= 12:
            remainder = base[2:]
            ret_ddd = ddd_clean if ddd_clean else ""
            ret_num = remainder if not ret_ddd else num_clean
            return ("55", ret_ddd, ret_num, base)
        else:
            full = f"55{base}"
            return ("55", ddd_clean, num_clean, full)
    elif ddi_clean:
        if base.startswith(ddi_clean) and len(base) >= len(ddi_clean) + 8:
            return (ddi_clean, ddd_clean, base[len(ddi_clean):] if not ddd_clean else num_clean, base)
        else:
            full = f"{ddi_clean}{base}"
            return (ddi_clean, ddd_clean, num_clean, full)
    else:
        if base.startswith("55") and len(base) >= 12:
            remainder = base[2:]
            return ("55", ddd_clean, remainder if not ddd_clean else num_clean, base)
        return ("", ddd_clean, num_clean, base)


def _resolve_ddi_for_row(ddd_val: str, num_val: str, raw_ddi_val: str, manual_ddi: str) -> str:
    """Decide o DDI a usar para uma linha do mapeamento composto (DDI/DDD/Número)."""
    ddi_p, _, _, _ = _decompose_and_build_phone(ddd_val, num_val, raw_ddi_val, manual_ddi)
    return ddi_p


def _get_phone_mapping_columns(phone_mapping) -> List[str]:
    """
    Retorna a lista de nomes de colunas referenciadas pelo mapeamento de telefone.
    """
    if isinstance(phone_mapping, dict) and phone_mapping.get('mode') == 'composite':
        cols = [phone_mapping.get('ddi_column'), phone_mapping.get('ddd_column'), phone_mapping.get('number_column')]
        return [c for c in cols if c]
    if isinstance(phone_mapping, str) and phone_mapping:
        return [phone_mapping]
    return []


def _build_phone_series(df: pd.DataFrame, phone_mapping) -> pd.Series:
    """
    Monta a série de telefone já limpa (somente dígitos) a partir do mapeamento.
    Respeita detecção de país e ddi_overrides.
    """
    if isinstance(phone_mapping, dict) and phone_mapping.get('mode') == 'composite':
        ddi_col = phone_mapping.get('ddi_column') or None
        ddd_col = phone_mapping.get('ddd_column') or None
        num_col = phone_mapping.get('number_column') or None
        manual_ddi = _clean_ddi_val(phone_mapping.get('manual_ddi')) if phone_mapping.get('manual_ddi') else ""
        ddi_overrides = phone_mapping.get('ddi_overrides') or {}

        full_phones = []
        for i in range(len(df)):
            row = df.iloc[i]
            ddd_val = row.get(ddd_col) if ddd_col else ""
            num_val = row.get(num_col) if num_col else ""
            raw_ddi_val = row.get(ddi_col) if ddi_col else ""

            override = None
            if str(i) in ddi_overrides:
                override = bool(ddi_overrides[str(i)])
            elif i in ddi_overrides:
                override = bool(ddi_overrides[i])

            _, _, _, full_phone = _decompose_and_build_phone(ddd_val, num_val, raw_ddi_val, manual_ddi, force_apply_ddi=override)
            full_phones.append(full_phone)

        return pd.Series(full_phones, index=df.index)

    # Caso simples: uma única coluna com o telefone completo
    if not phone_mapping or (isinstance(phone_mapping, str) and phone_mapping not in df.columns):
        return pd.Series([""] * len(df), index=df.index)
    col_name = phone_mapping if isinstance(phone_mapping, str) else phone_mapping.get('number_column')
    return df[col_name].apply(_clean_phone_digits)


def _build_phone_components_detailed(df: pd.DataFrame, phone_mapping):
    """
    Retorna os 3 pedaços (ddi_series, ddd_series, number_series) e a lista de metadados
    (is_brazilian, country, flag, ddi_applied) para a prévia visual.
    """
    empty = pd.Series([""] * len(df), index=df.index)
    meta_list = []

    ddi_overrides = {}
    if isinstance(phone_mapping, dict):
        ddi_overrides = phone_mapping.get('ddi_overrides') or {}

    if isinstance(phone_mapping, dict) and phone_mapping.get('mode') == 'composite':
        ddi_col = phone_mapping.get('ddi_column') or None
        ddd_col = phone_mapping.get('ddd_column') or None
        num_col = phone_mapping.get('number_column') or None
        manual_ddi = _clean_ddi_val(phone_mapping.get('manual_ddi')) if phone_mapping.get('manual_ddi') else ""

        ddi_list = []
        ddd_list = []
        num_list = []

        for i in range(len(df)):
            row = df.iloc[i]
            ddd_val = row.get(ddd_col) if ddd_col else ""
            num_val = row.get(num_col) if num_col else ""
            raw_ddi_val = row.get(ddi_col) if ddi_col else ""

            override = None
            if str(i) in ddi_overrides:
                override = bool(ddi_overrides[str(i)])
            elif i in ddi_overrides:
                override = bool(ddi_overrides[i])

            origin = _detect_phone_origin(ddd_val, num_val, raw_ddi_val)
            ddi_p, ddd_p, num_p, _ = _decompose_and_build_phone(ddd_val, num_val, raw_ddi_val, manual_ddi, force_apply_ddi=override)

            effective_ddi = manual_ddi or _clean_ddi_val(raw_ddi_val)
            ddi_applied = (ddi_p == effective_ddi) if effective_ddi else False

            ddi_list.append(ddi_p)
            ddd_list.append(ddd_p)
            num_list.append(num_p)
            meta_list.append({
                "is_brazilian": origin["is_brazilian"],
                "country": origin["country"],
                "flag": origin["flag"],
                "detected_ddi": origin.get("detected_ddi", ""),
                "ddi_applied": ddi_applied
            })

        return (
            pd.Series(ddi_list, index=df.index),
            pd.Series(ddd_list, index=df.index),
            pd.Series(num_list, index=df.index),
            meta_list
        )

    # Caso simples: uma única coluna com o telefone completo
    num_col = phone_mapping if isinstance(phone_mapping, str) else (phone_mapping.get('number_column') if isinstance(phone_mapping, dict) else None)
    if num_col and num_col in df.columns:
        num_series = df[num_col].apply(_clean_phone_digits)
        for i in range(len(df)):
            num_val = df.iloc[i].get(num_col)
            origin = _detect_phone_origin("", num_val, "")
            meta_list.append({
                "is_brazilian": origin["is_brazilian"],
                "country": origin["country"],
                "flag": origin["flag"],
                "detected_ddi": origin.get("detected_ddi", ""),
                "ddi_applied": False
            })
        return empty.copy(), empty.copy(), num_series, meta_list

    for _ in range(len(df)):
        meta_list.append({
            "is_brazilian": True,
            "country": "Brasil",
            "flag": "🇧🇷",
            "detected_ddi": "55",
            "ddi_applied": False
        })
    return empty.copy(), empty.copy(), empty.copy(), meta_list


def _build_phone_components(df: pd.DataFrame, phone_mapping):
    """
    Retorna os 3 pedaços (ddi_series, ddd_series, number_series) separados para a prévia visual.
    Mantém compatibilidade com desempacotamento de 3 elementos.
    """
    ddi_s, ddd_s, num_s, _ = _build_phone_components_detailed(df, phone_mapping)
    return ddi_s, ddd_s, num_s


def _extract_row_name(row, name_col: Optional[str]) -> Optional[str]:
    """Extrai e limpa o nome de uma linha do DataFrame."""
    if not name_col:
        return None
    raw = row.get(name_col)
    if raw is None or (isinstance(raw, float) and pd.isna(raw)):
        return None
    s = str(raw).strip()
    return s if s and s.lower() != 'nan' else None
