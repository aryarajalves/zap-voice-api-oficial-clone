# -*- coding: utf-8 -*-
"""
Utilitário para parsing e correspondência (matching) de filtros de avaliação/estrelas (feedback_filter).
Suporta:
- Valores únicos: "5", "skipped"
- Múltiplos valores: "1,2,3", "4,5", "skipped,1,2"
- Ranges / intervalos numéricos: "1-3", "1..3", "4-5"
- Genéricos / fallback: None, "", "all", "*"
"""
from typing import Optional, Set


def parse_feedback_filter_to_set(filter_str: Optional[str]) -> Optional[Set[str]]:
    """
    Converte uma string de filtro (ex: "1,2,3", "1-3", "skipped", "4,5", "all")
    em um conjunto de strings normalizadas, ou None se for 'all' / genérico / vazio.
    """
    if not filter_str:
        return None

    filter_clean = str(filter_str).strip().lower()
    if not filter_clean or filter_clean in ("all", "*"):
        return None

    result: Set[str] = set()
    tokens = [t.strip() for t in filter_clean.replace(";", ",").split(",") if t.strip()]

    for token in tokens:
        # Suporta ranges como "1-3" ou "1..3"
        range_sep = "-" if "-" in token else (".." if ".." in token else None)
        if range_sep:
            parts = token.split(range_sep, 1)
            if len(parts) == 2 and parts[0].strip().isdigit() and parts[1].strip().isdigit():
                start_n = int(parts[0].strip())
                end_n = int(parts[1].strip())
                step = 1 if start_n <= end_n else -1
                for n in range(start_n, end_n + step, step):
                    result.add(str(n))
                continue

        result.add(token)

    return result if result else None


def matches_feedback_filter(filter_str: Optional[str], detected_feedback: Optional[str]) -> bool:
    """
    Verifica se o detected_feedback (ex: "5", "skipped") casa com o filter_str.
    Se filter_str for None, vazio ou "all", aceita qualquer detected_feedback (comportamento de fallback).
    """
    allowed_set = parse_feedback_filter_to_set(filter_str)
    if allowed_set is None:
        return True

    if not detected_feedback:
        return False

    return str(detected_feedback).strip().lower() in allowed_set
