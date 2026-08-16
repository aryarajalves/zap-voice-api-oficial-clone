import asyncio
import os
from playwright.async_api import async_playwright

async def run():
    target_dir = r"C:\Users\aryar\.gemini\antigravity\brain\22f760d7-a9ce-4ff0-ba27-d5219aa98316\.tempmediaStorage"
    os.makedirs(target_dir, exist_ok=True)
    screenshot_toast = os.path.join(target_dir, "media_contact_import_empty_toast.png")

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

            # Criar um arquivo CSV temporário de teste com uma coluna vazia
            test_csv_path = os.path.join(target_dir, "test_empty_col.csv")
            with open(test_csv_path, "w", encoding="utf-8") as f:
                f.write("Nome;Número\n558596722944;\n553592112144;\n")

            print("5. Fazendo upload de CSV com coluna 'Número' vazia...")
            file_input = await page.query_selector("input[type='file']")
            if file_input:
                await file_input.set_input_files(test_csv_path)
                await page.wait_for_timeout(2000)

            print("6. Abrindo dropdown de Telefone...")
            dropdown_btns = await page.query_selector_all("button:has-text('-- Ignorar --')")
            if len(dropdown_btns) > 0:
                await dropdown_btns[0].click(force=True)
                await page.wait_for_timeout(600)

                print("7. Selecionando 'Número' no dropdown...")
                numero_opt = await page.query_selector("div.cursor-pointer:has-text('Número')")
                if numero_opt:
                    await numero_opt.click(force=True)
                    await page.wait_for_timeout(600)

            print("8. Clicando em 'Finalizar Importação'...")
            finish_btn = await page.query_selector("button:has-text('Finalizar Importação')")
            if finish_btn:
                await finish_btn.click(force=True)
                await page.wait_for_timeout(400)

        print("9. Capturando screenshot com o Toast de Bloqueio...")
        await page.screenshot(path=screenshot_toast)
        print("OK: Screenshot capturado com sucesso!")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
