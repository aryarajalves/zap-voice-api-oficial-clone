import pytest
from core.utils import robust_extract_labels

def test_extract_labels_already_list():
    input_data = ["tag1", "tag2"]
    result = robust_extract_labels(input_data)
    assert result == ["tag1", "tag2"]

def test_extract_labels_json_single_quotes():
    input_data = "['tag1', 'tag2']"
    result = robust_extract_labels(input_data)
    assert result == ["tag1", "tag2"]

def test_extract_labels_json_double_quotes():
    input_data = '["tag1", "tag2"]'
    result = robust_extract_labels(input_data)
    assert result == ["tag1", "tag2"]

def test_extract_labels_comma_separated():
    input_data = "tag1, tag2, tag3"
    result = robust_extract_labels(input_data)
    assert result == ["tag1", "tag2", "tag3"]

def test_extract_labels_empty():
    assert robust_extract_labels(None) == []
    assert robust_extract_labels("") == []
    assert robust_extract_labels([]) == []
    assert robust_extract_labels("[]") == []

def test_extract_labels_single_string():
    input_data = "only_one_tag"
    result = robust_extract_labels(input_data)
    assert result == ["only_one_tag"]

def test_extract_labels_with_whitespace():
    input_data = "  tag1  ,   tag2  "
    result = robust_extract_labels(input_data)
    assert result == ["tag1", "tag2"]

def test_extract_labels_malformed_json_fallback():
    # If it starts with [ but is not valid JSON, it should fallback to comma split
    input_data = "[malformed, json]"
    result = robust_extract_labels(input_data)
    assert result == ["[malformed", "json]"]
