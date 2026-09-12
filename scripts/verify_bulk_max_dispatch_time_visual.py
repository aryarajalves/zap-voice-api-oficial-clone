# -*- coding: utf-8 -*-
import os
import time
import requests
from PIL import Image
from playwright.sync_api import sync_playwright

artifact_dir = r"C:\Users\aryar\.gemini\antigravity\brain\bf2ea061-a3ff-4a86-80ae-35c392742fa3"

print("1. Efetuando autenticação...", flush=True)
resp = requests.post("http://127.0.0.1:8000/api/auth/token", data={
    "username": "aryarajmarketing@gmail.com",
    "password": "123456"
}, timeout=10)
token = resp.json().get("access_token")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1440, "height": 900})
    page = context.new_page()

    print("2. Acessando frontend...", flush=True)
    page.goto("http://127.0.0.1:5176", wait_until="commit")
    time.sleep(1)
    page.evaluate(f"""() => {{
        localStorage.setItem('token', '{token}');
        localStorage.setItem('activeClientId', '11');
        localStorage.setItem('currentView', 'bulk_sender');
    }}""")

    page.goto("http://127.0.0.1:5176", wait_until="domcontentloaded")
    time.sleep(3)

    print("3. Abrindo dropdown de templates...", flush=True)
    page.wait_for_selector('.template-dropdown-container', timeout=15000)
    page.locator('.template-dropdown-container > div').first.click()
    time.sleep(1)

    print("4. Selecionando primeiro template da lista...", flush=True)
    page.wait_for_selector('.max-h-72 .hover\\:bg-green-500\\/10', timeout=10000)
    page.locator('.max-h-72 .hover\\:bg-green-500\\/10').first.click()
    time.sleep(1.5)

    print("5. Clicando no botão 'Avançar para Contatos'...", flush=True)
    page.wait_for_selector('#bulk-advance-btn:not([disabled])', timeout=10000)
    page.locator('#bulk-advance-btn').click()
    time.sleep(2)

    print("6. Rolando até o card '03 Opções de Disparo'...", flush=True)
    page.wait_for_selector('[data-testid="bulk-max-dispatch-time-input"]', timeout=15000)
    limit_input = page.locator('[data-testid="bulk-max-dispatch-time-input"]')
    limit_input.scroll_into_view_if_needed()
    time.sleep(1)

    # Screenshot 1: Estado padrão com Fallback de 24h
    print("7. Capturando Screenshot 1 (Padrão 24h)...", flush=True)
    shot1_path = os.path.join(artifact_dir, "bulk_prazo_limite_padrao_24h.png")
    page.screenshot(path=shot1_path)
    print("Salvo em:", shot1_path, flush=True)

    # Crop do Card
    try:
        box = page.locator('div:has-text("Prazo Limite de Envio (Opcional)")').last.bounding_box()
        if box:
            im = Image.open(shot1_path)
            # Expandir um pouco para contexto
            x1 = max(0, int(box['x'] - 20))
            y1 = max(0, int(box['y'] - 30))
            x2 = min(im.width, int(box['x'] + box['width'] + 20))
            y2 = min(im.height, int(box['y'] + box['height'] + 30))
            cropped1 = im.crop((x1, y1, x2, y2))
            crop1_path = os.path.join(artifact_dir, "crop_bulk_prazo_limite_padrao_24h.png")
            cropped1.save(crop1_path)
            print("Crop 1 salvo em:", crop1_path, flush=True)
    except Exception as e:
        print("Erro ao cropar 1:", e)

    # 8. Preencher data/hora personalizada
    print("8. Preenchendo data e hora limite no input...", flush=True)
    limit_input.fill("2026-09-15T22:30")
    limit_input.dispatch_event("input")
    limit_input.dispatch_event("change")
    time.sleep(1)

    print("9. Verificando badge 'Personalizado' e botão de limpar...", flush=True)
    page.wait_for_selector('text=Personalizado', timeout=5000)
    page.wait_for_selector('[data-testid="bulk-clear-max-dispatch-time-btn"]', timeout=5000)

    # Screenshot 2: Estado personalizado
    print("10. Capturando Screenshot 2 (Personalizado com botão limpar)...", flush=True)
    shot2_path = os.path.join(artifact_dir, "bulk_prazo_limite_personalizado.png")
    page.screenshot(path=shot2_path)
    print("Salvo em:", shot2_path, flush=True)

    # Crop do Card personalizado
    try:
        box = page.locator('div:has-text("Prazo Limite de Envio (Opcional)")').last.bounding_box()
        if box:
            im = Image.open(shot2_path)
            x1 = max(0, int(box['x'] - 20))
            y1 = max(0, int(box['y'] - 30))
            x2 = min(im.width, int(box['x'] + box['width'] + 20))
            y2 = min(im.height, int(box['y'] + box['height'] + 30))
            cropped2 = im.crop((x1, y1, x2, y2))
            crop2_path = os.path.join(artifact_dir, "crop_bulk_prazo_limite_personalizado.png")
            cropped2.save(crop2_path)
            print("Crop 2 salvo em:", crop2_path, flush=True)
    except Exception as e:
        print("Erro ao cropar 2:", e)

    # 11. Testar clique no botão limpar
    print("11. Clicando no botão Limpar Prazo Limite...", flush=True)
    page.locator('[data-testid="bulk-clear-max-dispatch-time-btn"]').click()
    time.sleep(1)

    # Verificar que limpou
    val = limit_input.input_value()
    print("Valor após limpar:", repr(val))
    assert val == "", f"Esperava valor vazio, obteve: {val}"
    page.wait_for_selector('text=Fallback Padrão de 24h:', timeout=5000)
    print("✅ Validação visual concluída com 100% de sucesso!", flush=True)

    browser.close()
