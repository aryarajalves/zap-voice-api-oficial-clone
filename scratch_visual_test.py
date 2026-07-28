import asyncio
from playwright.async_api import async_playwright
import os

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1400, "height": 950})
        page = await context.new_page()

        print("1. Acessando http://localhost:5176...")
        await page.goto("http://localhost:5176", wait_until="networkidle")

        # Fazer login
        if await page.locator("input[type='email']").is_visible():
            print("2. Efetuando login...")
            await page.fill("input[type='email']", "aryarajmarketing@gmail.com")
            await page.fill("input[type='password']", "123456")
            await page.click("button[type='submit']")
            await page.wait_for_timeout(3000)

        await page.screenshot(path="scratch_01_dashboard.png")

        # Clicar no menu E-mail Marketing no sidebar
        print("3. Clicando no botão 'E-mail Marketing' do sidebar...")
        sidebar_button = page.locator("aside button:has-text('E-mail Marketing')")
        await sidebar_button.click()
        await page.wait_for_timeout(2000)

        await page.screenshot(path="scratch_02_email_mkt_page.png")

        # Clicar na aba Templates
        print("4. Clicando na aba 'Templates'...")
        templates_tab = page.locator("button:has-text('Templates')")
        await templates_tab.click()
        await page.wait_for_timeout(1500)

        await page.screenshot(path="scratch_03_templates_tab.png")

        # Clicar em Novo Template
        print("5. Clicando em 'Novo Template'...")
        novo_btn = page.locator("button:has-text('Novo Template')")
        await novo_btn.click()
        await page.wait_for_timeout(2000)

        await page.screenshot(path="scratch_04_modal_open.png")

        # Adicionar bloco de imagem
        print("6. Clicando no botão 'Imagem' para adicionar bloco de imagem...")
        img_btn = page.locator("button:has-text('Imagem')")
        await img_btn.first.click()
        await page.wait_for_timeout(2000)

        # Salvar screenshot final da modal com painel de propriedades
        screenshot_path = os.path.abspath("C:/Users/aryar/.gemini/antigravity/brain/0a0cba15-6ae4-4669-be60-9cf57362e6e9/upload_imagem_propriedades.png")
        await page.screenshot(path=screenshot_path, full_page=False)
        print(f"Screenshot final salvo com sucesso em: {screenshot_path}")

        # Validar presença do texto de upload
        upload_text = page.get_by_text("Upload de Imagem (do computador)", exact=False)
        is_visible = await upload_text.is_visible()
        print(f"OPÇÃO DE UPLOAD VISÍVEL: {is_visible}")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
