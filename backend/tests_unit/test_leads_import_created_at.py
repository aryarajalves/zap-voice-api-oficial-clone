import pytest
from datetime import datetime, timezone
import pandas as pd
from routers.leads_import import _parse_datetime_smart

def test_parse_datetime_smart_formats():
    # Format dd/mm/yyyy hh:mm:ss
    dt1 = _parse_datetime_smart("06/08/2026 15:53:15")
    assert dt1 is not None
    assert dt1.day == 6
    assert dt1.month == 8
    assert dt1.year == 2026
    assert dt1.hour == 15
    assert dt1.minute == 53
    assert dt1.second == 15

    # Format yyyy-mm-dd hh:mm:ss
    dt2 = _parse_datetime_smart("2026-08-06 15:53:15")
    assert dt2 is not None
    assert dt2.day == 6
    assert dt2.month == 8
    assert dt2.year == 2026

    # Format dd/mm/yyyy
    dt3 = _parse_datetime_smart("15/03/2025")
    assert dt3 is not None
    assert dt3.day == 15
    assert dt3.month == 3
    assert dt3.year == 2025

    # Timestamp object / pandas Datetime
    ts = pd.Timestamp("2026-08-06 15:50:00")
    dt4 = _parse_datetime_smart(ts)
    assert dt4 is not None
    assert dt4.hour == 15

    # Invalid / empty cases
    assert _parse_datetime_smart(None) is None
    assert _parse_datetime_smart("") is None
    assert _parse_datetime_smart("nan") is None
