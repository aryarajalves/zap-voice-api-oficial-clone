import asyncio
import os
import pandas as pd
from playwright.async_api import async_playwright

async def run():
    target_dir = r"C:\Users\aryar\.gemini\antigravity\brain\22f760d7-a9ce-4ff0-ba27-d5219aa98316\.tempmediaStorage"
    os.makedirs(target_dir, exist_ok=True)
    screenshot_path = os.path.join(target_dir, "media_column_empty_validation.png")

    csv_file_path = os.path.abspath("test_empty_col.xlsx")
    df = pd.DataFrame({
        "Telefone": ["5511999991111", "5511999992222"],
        "Posição": ["", ""],
        "Nome": ["Carlos", "Ana"]
    })
    df.to_excel(csv_file_path, index=False)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={'width': 1440, 'height': 900})
        page = await context.new_page()

        print("1. Acessando http://localhost:5176 ...")
        await page.goto("http://localhost:5176", wait_until="networkidle")
        await page.wait_for_timeout(1000)

        # Login
        if "login" in page.url or await page.query_selector("input[type='password']"):
            print("2. Realizando login...")
            await page.fill("input[type='email'], input[name='email']", "aryarajmarketing@gmail.com")
            await page.fill("input[type='password']", "123456")
            await page.click("button[type='submit'], button:has-text('Entrar')")
            await page.wait_for_timeout(3000)

        print("3. Clicando em 'Disparo em Massa'...")
        bulk_menu = await page.query_selector("nav button:has-text('Disparo em Massa'), button:has-text('Disparo em Massa')")
        if bulk_menu:
            await bulk_menu.click()
            await page.wait_for_timeout(2000)

        print("4. Abrindo dropdown de templates...")
        tmpl_dropdown = await page.query_selector(".template-dropdown-container > div")
        if tmpl_dropdown:
            await tmpl_dropdown.click()
            await page.wait_for_timeout(1000)

            items = await page.query_selector_all(".template-dropdown-container .max-h-72 > div")
            for item in items:
                text = await item.inner_text()
                if "Nenhum Template" not in text and text.strip():
                    await item.click()
                    break
            await page.wait_for_timeout(1000)

        print("5. Clicando em 'AVANÇAR PARA CONTATOS'...")
        adv_btn = await page.query_selector("button:has-text('AVANÇAR PARA CONTATOS'), button:has-text('Avançar para Contatos')")
        if adv_btn:
            await adv_btn.click()
            await page.wait_for_timeout(2000)

        print("6. Clicando na aba 'UPLOAD'...")
        upload_tab = await page.query_selector("button:has-text('UPLOAD')")
        if upload_tab:
            await upload_tab.click()
            await page.wait_for_timeout(1000)

        print("7. Fazendo upload do arquivo Excel com coluna vazia...")
        file_input = await page.query_selector("input[type='file']")
        if file_input:
            await file_input.set_input_files(csv_file_path)
            await page.wait_for_timeout(2000)

        print("8. Modal aberto. Clicando no badge 'Etiquetas' na linha 'Posição' (que está vazia)...")
        # Encontrar o container da linha 'Posição'
        rows = await page.query_selector_all(".max-h-\\[50vh\\] > div")
        for r in rows:
            text = await r.inner_text()
            if "Posição" in text:
                tag_btn = await r.query_selector("button:has-text('Etiquetas')")
                if tag_btn:
                    await tag_btn.click()
                    print("Badge 'Etiquetas' selecionado na coluna Posição.")
                    break
        await page.wait_for_timeout(500)

        print("9. Clicando em 'CONTINUAR' para disparar o toast de validação de coluna vazia...")
        continue_btn = await page.query_selector("button:has-text('CONTINUAR'), button:has-text('Continuar')")
        if continue_btn:
            await continue_btn.click()
            await page.wait_for_timeout(600)

        print(f"10. Capturando screenshot em {screenshot_path} ...")
        await page.screenshot(path=screenshot_path)
        print("OK: Screenshot com toast de validação capturado com sucesso!")

        await browser.close()

    if os.path.exists(csv_file_path):
        os.remove(csv_file_path)

if __name__ == "__main__":
    asyncio.run(run())
