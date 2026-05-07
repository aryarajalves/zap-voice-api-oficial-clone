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
    Extracts a list of labels from various formats recursively.
    Handles: List of strings, JSON strings (single/double escaped), comma-separated strings.
    """
    if not label_data:
        return []

    import json
    curr = label_data
    
    # Recursive unescaping (up to 5 levels)
    max_depth = 5
    while max_depth > 0:
        if isinstance(curr, list):
            return [str(l).strip() for l in curr if l]
        
        if not isinstance(curr, str):
            break
            
        lb_str = curr.strip()
        if not lb_str:
            return []
            
        # Case 1: JSON-like array or string
        if (lb_str.startswith('[') and lb_str.endswith(']')) or (lb_str.startswith('"') and lb_str.endswith('"')):
            try:
                # Handle single-quoted pseudo-JSON common in Python stringification
                if "'" in lb_str and '"' not in lb_str:
                    lb_str = lb_str.replace("'", '"')
                
                parsed = json.loads(lb_str)
                if parsed == curr: # Infinite loop protection
                    break
                curr = parsed
            except Exception:
                # If JSON fails but it looks like a comma-list inside brackets, try splitting
                if lb_str.startswith('[') and lb_str.endswith(']'):
                    content = lb_str[1:-1]
                    if ',' in content:
                        curr = content.split(',')
                    else:
                        break
                else:
                    break
        else:
            # Case 2: Comma-separated or single string
            if ',' in lb_str:
                return [l.strip() for l in lb_str.split(',') if l.strip()]
            return [lb_str]
        
        max_depth -= 1

    # Fallback
    if isinstance(curr, list):
        return [str(l).strip() for l in curr if l]
    if isinstance(curr, str) and curr:
        return [curr.strip()]
    return []
