
class MockComp:
    def __init__(self, type, parameters):
        self.type = type
        self.parameters = parameters
    def get(self, key, default=None):
        return getattr(self, key, default)

components = [
    {
        "type": "body",
        "parameters": [
            {"type": "text", "text": "Juliana"},
            {"type": "text", "text": "Laser Day"}
        ]
    }
]

template_body = "Oieee {{1}}, tudo bem? Vi seu interesse no {{2}}."
private_msg_text = template_body

# OLD WRONG LOGIC
old_private_msg_text = template_body
for idx, comp in enumerate(components):
    text_val = comp.get("text", "") # comp is {"type": "body", ...}, has no "text"
    old_private_msg_text = old_private_msg_text.replace(f"{{{{{idx+1}}}}}", str(text_val))

print(f"Old Logic Result: '{old_private_msg_text}'")

# NEW CORRECT LOGIC
new_private_msg_text = template_body
body_params = []
for comp in components:
    if comp.get("type") == "body":
        body_params = comp.get("parameters", [])
        break

for idx, p in enumerate(body_params):
    text_val = p.get("text", "-")
    new_private_msg_text = new_private_msg_text.replace(f"{{{{{idx+1}}}}}", str(text_val))

print(f"New Logic Result: '{new_private_msg_text}'")

assert "Juliana" in new_private_msg_text
assert "Laser Day" in new_private_msg_text
print("Verification Success!")
