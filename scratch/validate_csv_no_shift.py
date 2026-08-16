import asyncio
import os
from playwright.async_api import async_playwright

async def run():
    target_dir = r"C:\Users\aryar\.gemini\antigravity\brain\22f760d7-a9ce-4ff0-ba27-d5219aa98316\.tempmediaStorage"
    os.makedirs(target_dir, exist_ok=True)
    screenshot_preview = os.path.join(target_dir, "media_csv_correct_alignment.png")

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

        print("3. Abrindo página de Contatos no Sidebar...")
        contatos_btn = await page.query_selector("aside button:has-text('Contatos')")
        if contatos_btn:
            await contatos_btn.click(force=True)
            await page.wait_for_timeout(2000)

        print("4. Abrindo modal de Importar Contatos...")
        import_btn = await page.query_selector("button:has-text('Importar'), button:has-text('Importar Contatos')")
        if import_btn:
            await import_btn.click(force=True)
            await page.wait_for_timeout(1000)

            # Criar um arquivo CSV exatamente como o do Google Sheets (com vírgula no final da linha)
            test_csv_path = os.path.join(target_dir, "test_sheets_sendflow.csv")
            with open(test_csv_path, "w", encoding="utf-8") as f:
                f.write("Posição,Grupo,Nome,Número\n1,#7 OFERTA ABSURDA | Corporação Salesforce,,558596722944,\n2,#7 OFERTA ABSURDA | Corporação Salesforce,,553592112144,\n3,#6 OFERTA ABSURDA | Corporação Salesforce,,558596023278,\n")

            print("5. Fazendo upload do CSV com colunas alinhadas...")
            file_input = await page.query_selector("input[type='file']")
            if file_input:
                await file_input.set_input_files(test_csv_path)
                await page.wait_for_timeout(2000)

        print("6. Capturando screenshot da Prévia dos Dados com o alinhamento corrigido...")
        await page.screenshot(path=screenshot_preview)
        print("OK: Screenshot capturado com sucesso!")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
