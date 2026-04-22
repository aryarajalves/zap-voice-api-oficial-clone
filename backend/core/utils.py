import re
import logging

logger = logging.getLogger("CoreUtils")

def get_nested(data, path):
    """
    Retrieves a nested value from a dictionary using a dot-separated path.
    """
    if not path: return None
    try:
        parts = path.split('.')
        curr = data
        for p in parts:
            if isinstance(curr, dict):
                curr = curr.get(p)
            else:
                return None
        return curr
    except Exception as e:
        logger.error(f"Error in get_nested: {e}")
        return None

def extract_value_by_path(data, path):
    """
    Legacy wrapper for get_nested to maintain compatibility.
    """
    val = get_nested(data, path)
    return val, path if val is not None else None

def format_phone(phone, country="Brasil"):
    """
    Sanitizes and formats a phone number.
    """
    if not phone: return None
    clean = "".join(filter(str.isdigit, str(phone)))
    # Add Brazil country code if missing and length is 10-11
    if not clean.startswith("55") and 10 <= len(clean) <= 11 and country == "Brasil":
         clean = "55" + clean
    return clean

def find_phone_in_payload(payload, key):
    """
    Finds a phone number in the payload using a specific key or path.
    """
    val = get_nested(payload, key)
    return val, key if val is not None else (None, None)

def find_name_in_payload(payload, key):
    """
    Finds a name in the payload using a specific key or path.
    """
    val = get_nested(payload, key)
    return val, key if val is not None else (None, None)
def robust_extract_labels(label_data):
    """
    Extracts a list of labels from various formats:
    - List of strings: ['tag1', 'tag2']
    - JSON string: "['tag1', 'tag2']" or '["tag1", "tag2"]'
    - Comma-separated string: "tag1, tag2"
    """
    if not label_data:
        return []

    if isinstance(label_data, list):
        return [str(l).strip() for l in label_data if l]

    if isinstance(label_data, str) and label_data.strip():
        import json
        lb_str = label_data.strip()
        # Case 1: Likely a JSON array string
        if lb_str.startswith('[') and lb_str.endswith(']'):
            try:
                # Replace single quotes with double quotes for valid JSON
                # This is a common pattern when Python lists are coerced to strings in DBs
                json_compatible = lb_str.replace("'", '"')
                parsed = json.loads(json_compatible)
                if isinstance(parsed, list):
                    return [str(l).strip() for l in parsed if l]
            except Exception:
                pass
        
        # Case 2: Comma-separated or fallback
        return [l.strip() for l in lb_str.split(',') if l.strip()]

    return []
