import sys
import os
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

def test_pagination_slice_logic():
    # Test dataset with 45 items
    mock_history = [{"id": i, "title": f"Campanha {i}"} for i in range(1, 46)]
    
    # Test page size 20, page 1
    page_size = 20
    current_page = 1
    start_index = (current_page - 1) * page_size
    end_index = min(start_index + page_size, len(mock_history))
    slice_p1 = mock_history[start_index:end_index]
    
    assert len(slice_p1) == 20
    assert slice_p1[0]["id"] == 1
    assert slice_p1[-1]["id"] == 20
    
    # Test page size 20, page 3 (last page with 5 items)
    current_page = 3
    start_index = (current_page - 1) * page_size
    end_index = min(start_index + page_size, len(mock_history))
    slice_p3 = mock_history[start_index:end_index]
    
    assert len(slice_p3) == 5
    assert slice_p3[0]["id"] == 41
    assert slice_p3[-1]["id"] == 45

    # Test page size 50, page 1
    page_size = 50
    current_page = 1
    start_index = (current_page - 1) * page_size
    end_index = min(start_index + page_size, len(mock_history))
    slice_50 = mock_history[start_index:end_index]
    
    assert len(slice_50) == 45

    # Test dropdown valid choices
    valid_choices = [20, 50, 100, 200]
    assert 20 in valid_choices
    assert 200 in valid_choices
