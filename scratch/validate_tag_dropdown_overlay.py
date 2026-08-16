import asyncio
import os
from playwright.async_api import async_playwright

async def run():
    target_dir = r"C:\Users\aryar\.gemini\antigravity\brain\22f760d7-a9ce-4ff0-ba27-d5219aa98316\.tempmediaStorage"
    os.makedirs(target_dir, exist_ok=True)
    screenshot_tag = os.path.join(target_dir, "media_tag_dropdown_scrolled_overlap.png")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={'width': 1440, 'height': 1100})
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

        print("3. Abrindo página de Disparo em Massa...")
        await page.goto("http://localhost:5176/#/bulk-sender", wait_until="networkidle")
        await page.wait_for_timeout(2000)

        print("4. Clicando no seletor de template...")
        await page.click(".template-dropdown-container > div", force=True)
        await page.wait_for_timeout(600)

        template_opt = await page.query_selector(".template-dropdown-container .max-h-72 > div:nth-child(2)")
        if template_opt:
            await template_opt.click(force=True)
            await page.wait_for_timeout(1000)

        print("5. Clicando no botão Avançar para Contatos...")
        await page.click("#bulk-advance-btn", force=True)
        await page.wait_for_timeout(2000)

        print("6. Selecionando aba 'Buscar por Etiquetas'...")
        tag_tab = await page.query_selector("button:has-text('Buscar por Etiquetas'), button:has-text('Etiquetas')")
        if tag_tab:
            await tag_tab.click(force=True)
            await page.wait_for_timeout(1000)

        print("7. Carregando contatos para a lista aparecer embaixo...")
        tag_btn = await page.query_selector("button:has(svg.text-emerald-400)")
        if tag_btn:
            await tag_btn.click(force=True)
            await page.wait_for_timeout(600)
            tag_item = await page.query_selector(".max-h-60 > div")
            if tag_item:
                await tag_item.click(force=True)
                await page.wait_for_timeout(600)

            await page.click("text=Destinatários", force=True)
            await page.wait_for_timeout(400)

            load_btn = await page.query_selector("button:has-text('Carregar Leads da Etiqueta')")
            if load_btn:
                await load_btn.click(force=True)
                await page.wait_for_timeout(2500)

            print("8. Reabrindo o dropdown de etiquetas...")
            tag_btn_reopen = await page.query_selector("button:has(svg.text-emerald-400)")
            if tag_btn_reopen:
                await tag_btn_reopen.click(force=True)
                await page.wait_for_timeout(800)

        print("9. Rolando a tela 250px para ver a sobreposição perfeitamente...")
        await page.evaluate("window.scrollBy(0, 250)")
        await page.wait_for_timeout(500)

        print("10. Capturando screenshot com scroll...")
        await page.screenshot(path=screenshot_tag)
        print("OK: Screenshot capturado com sucesso!")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
