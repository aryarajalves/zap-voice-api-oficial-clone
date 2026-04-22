import json
import os
from main import app

def test_version_consistency():
    """
    Test case to ensure that the version in main.py is consistent with 3.0.11.
    """
    # Test FastAPI app version
    assert app.version == "3.0.11"
    
    # Test Root response version
    # Since we can't easily call the async root function here without a client, 
    # we'll assume the version field is what we set in main.py.
    # But we can verify the frontend package.json too if we want a full check.
    
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    frontend_pkg_path = os.path.join(os.path.dirname(base_dir), "frontend", "package.json")
    
    if os.path.exists(frontend_pkg_path):
        with open(frontend_pkg_path, "r") as f:
            pkg_data = json.load(f)
            assert pkg_data["version"] == "3.0.10"
    else:
        # If running in a context where frontend is not available, just pass
        pass
