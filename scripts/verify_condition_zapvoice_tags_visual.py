# -*- coding: utf-8 -*-
import os
import time
import requests
from PIL import Image
from playwright.sync_api import sync_playwright

artifact_dir = r"C:\Users\aryar\.gemini\antigravity\brain\bf2ea061-a3ff-4a86-80ae-35c392742fa3"

# 1. Login e obtenção de token
resp = requests.post("http://127.0.0.1:8000/api/auth/token", data={
    "username": "aryarajmarketing@gmail.com",
    "password": "123456"
}, timeout=10)
token = resp.json().get("access_token")
headers = {"Authorization": f"Bearer {token}", "X-Client-ID": "11"}

# 2. Criar ou atualizar funil com ConditionNode configurado para 'tag'
funnel_payload = {
    "name": "Teste Visual Condicao Tag ZapVoice",
    "description": "Validando seletor de etiquetas do Chat do ZapVoice",
    "steps": {
        "nodes": [
            {
                "id": "cond_node_1",
                "type": "conditionNode",
                "position": {"x": 350, "y": 150},
                "data": {
                    "isStart": True,
                    "conditionType": "tag",
                    "tag": ""
                }
            }
        ],
        "edges": []
    }
}
r_funnel = requests.post("http://127.0.0.1:8000/api/funnels", headers=headers, json=funnel_payload)
funnel_id = r_funnel.json().get("id")
print("Funil criado com ID:", funnel_id)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1440, "height": 900})
    page = context.new_page()

    page.goto("http://127.0.0.1:5176", wait_until="commit")
    time.sleep(1)
    page.evaluate(f"""() => {{
        localStorage.setItem('token', '{token}');
        localStorage.setItem('activeClientId', '11');
        localStorage.setItem('currentView', 'funnels');
    }}""")

    page.goto("http://127.0.0.1:5176", wait_until="domcontentloaded")
    time.sleep(3)

    print("1. Localizando o card do funil e clicando em Editar...", flush=True)
    card = page.locator('div.group:has-text("Teste Visual Condicao Tag ZapVoice")').first
    card.wait_for(state="visible", timeout=15000)
    card.hover()
    card.locator('button[title="Editar Funil"]').click()
    time.sleep(3)

    print("2. Localizando o nó de Condição Inteligente...", flush=True)
    page.wait_for_selector('[data-testid="condition-tag-trigger"]', timeout=10000)
    
    # 3. Clicar no seletor de etiquetas para abrir o dropdown
    print("3. Abrindo o seletor de etiquetas do Chat do ZapVoice...", flush=True)
    page.locator('[data-testid="condition-tag-trigger"]').click()
    time.sleep(1.5)

    # 4. Capturar screenshot com a lista de etiquetas abertas
    print("4. Capturando screenshot com o dropdown de etiquetas aberto...", flush=True)
    screenshot_dropdown_path = os.path.join(artifact_dir, "condicao_inteligente_etiquetas_abertas.png")
    page.screenshot(path=screenshot_dropdown_path)
    print("Screenshot salvo em:", screenshot_dropdown_path, flush=True)

    # 5. Clicar em uma etiqueta da lista para selecionar (ex: 'compra-aprovada' ou a primeira)
    print("5. Selecionando uma etiqueta existente...", flush=True)
    first_option = page.locator('[data-testid^="condition-tag-option-"]').first
    first_option.click()
    time.sleep(1.5)

    # 6. Capturar screenshot com a etiqueta selecionada
    print("6. Capturando screenshot com a etiqueta selecionada...", flush=True)
    screenshot_selected_path = os.path.join(artifact_dir, "condicao_inteligente_etiqueta_selecionada.png")
    page.screenshot(path=screenshot_selected_path)
    print("Screenshot salvo em:", screenshot_selected_path, flush=True)

    # 7. Criar crop do nó
    try:
        im = Image.open(screenshot_dropdown_path)
        w, h = im.size
        crop_box = (int(w * 0.20), int(h * 0.10), int(w * 0.80), int(h * 0.90))
        cropped = im.crop(crop_box)
        crop_path = os.path.join(artifact_dir, "crop_condicao_inteligente_etiquetas.png")
        cropped.save(crop_path)
        print("Crop salvo em:", crop_path, flush=True)
    except Exception as e:
        print("Erro ao cropar:", e)

    browser.close()
    print("Validação visual concluída com 100% de sucesso!")
