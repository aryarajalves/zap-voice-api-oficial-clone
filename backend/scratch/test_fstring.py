
v_idx = 1
v_key_alt = f"{{{{{v_idx}}}}}"
print(f"v_key_alt for v_idx=1: {v_key_alt}")

c = {"{{1}}": "Aryaraj"}
print(f"c.get(v_key_alt): {c.get(v_key_alt)}")

# Vamos testar o que eu usei no código:
# f"{{{{{v_idx}}}}}"
# {{ -> {
# {{ -> {
# {v_idx} -> 1
# Erro?
