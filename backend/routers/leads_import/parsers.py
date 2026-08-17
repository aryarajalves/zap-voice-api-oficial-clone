import os
import io
from typing import Optional, List
from datetime import datetime, timezone
import pandas as pd

IMPORT_FILES_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "static", "imports")
os.makedirs(IMPORT_FILES_DIR, exist_ok=True)

# Linhas sem coluna de DDD preenchida cujo "Número" já tem 10+ dígitos provavelmente já
# são um telefone completo (ex: número internacional, ou a planilha já embutiu o DDD no
# "Número" só nessa linha) — nesses casos NÃO grudamos o DDI em cima, senão corrompe.
_ALREADY_COMPLETE_MIN_LEN = 10

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


def read_csv_smart(content: bytes, sep: str = ";") -> pd.DataFrame:
    """Tenta ler CSV detectando encoding automaticamente e garantindo que nenhuma coluna vire índice."""
    for encoding in ("utf-8-sig", "utf-8", "cp1252", "latin-1"):
        try:
            df = pd.read_csv(io.BytesIO(content), sep=sep, encoding=encoding, index_col=False)
            if len(df.columns) > 1:
                return df
        except Exception:
            continue
    # fallback — latin-1 cobre todos os 256 bytes, nunca vai lançar erro de encoding
    return pd.read_csv(io.BytesIO(content), sep=sep, encoding="latin-1", index_col=False)


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


def _clean_phone_digits(v) -> str:
    """Extrai só os dígitos de um valor de célula (trata NaN/None)."""
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return ""
    if isinstance(v, float) and v.is_integer():
        v = int(v)
    return "".join(filter(str.isdigit, str(v)))


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
    return "".join(filter(str.isdigit, str(v)))


def _resolve_ddi_for_row(ddd_val: str, num_val: str, raw_ddi_val: str, manual_ddi: str) -> str:
    """Decide o DDI a usar para uma linha do mapeamento composto (DDI/DDD/Número)."""
    if raw_ddi_val:
        return raw_ddi_val
    if not ddd_val and len(num_val) >= _ALREADY_COMPLETE_MIN_LEN:
        return ""
    return manual_ddi


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
    """
    if isinstance(phone_mapping, dict) and phone_mapping.get('mode') == 'composite':
        ddi_col = phone_mapping.get('ddi_column') or None
        ddd_col = phone_mapping.get('ddd_column') or None
        num_col = phone_mapping.get('number_column') or None
        manual_ddi = _clean_phone_digits(phone_mapping.get('manual_ddi')) if phone_mapping.get('manual_ddi') else ""

        def compose_row(row):
            ddd_val = _clean_phone_digits(row.get(ddd_col)) if ddd_col else ""
            num_val = _clean_phone_digits(row.get(num_col)) if num_col else ""
            raw_ddi_val = _clean_ddi_val(row.get(ddi_col)) if ddi_col else ""
            ddi_val = _resolve_ddi_for_row(ddd_val, num_val, raw_ddi_val, manual_ddi)
            return f"{ddi_val}{ddd_val}{num_val}"

        return df.apply(compose_row, axis=1)

    # Caso simples: uma única coluna com o telefone completo
    if not phone_mapping or phone_mapping not in df.columns:
        return pd.Series([""] * len(df), index=df.index)
    return df[phone_mapping].apply(_clean_phone_digits)


def _build_phone_components(df: pd.DataFrame, phone_mapping):
    """
    Retorna os 3 pedaços (ddi_series, ddd_series, number_series) separados para a prévia visual.
    """
    empty = pd.Series([""] * len(df), index=df.index)

    if isinstance(phone_mapping, dict) and phone_mapping.get('mode') == 'composite':
        ddi_col = phone_mapping.get('ddi_column') or None
        ddd_col = phone_mapping.get('ddd_column') or None
        num_col = phone_mapping.get('number_column') or None
        manual_ddi = _clean_ddi_val(phone_mapping.get('manual_ddi')) if phone_mapping.get('manual_ddi') else ""

        raw_ddi_series = df[ddi_col].apply(_clean_ddi_val) if ddi_col else empty.copy()
        ddd_series = df[ddd_col].apply(_clean_phone_digits) if ddd_col else empty.copy()
        num_series = df[num_col].apply(_clean_phone_digits) if num_col else empty.copy()
        ddi_series = pd.Series(
            [
                _resolve_ddi_for_row(ddd_series.iat[i], num_series.iat[i], raw_ddi_series.iat[i], manual_ddi)
                for i in range(len(df))
            ],
            index=df.index,
        )
        return ddi_series, ddd_series, num_series

    # Caso simples: uma única coluna com o telefone completo
    num_series = df[phone_mapping].apply(_clean_phone_digits) if (phone_mapping and phone_mapping in df.columns) else empty.copy()
    return empty.copy(), empty.copy(), num_series


def _extract_row_name(row, name_col: Optional[str]) -> Optional[str]:
    """Extrai e limpa o nome de uma linha do DataFrame."""
    if not name_col:
        return None
    raw = row.get(name_col)
    if raw is None or (isinstance(raw, float) and pd.isna(raw)):
        return None
    s = str(raw).strip()
    return s if s and s.lower() != 'nan' else None
