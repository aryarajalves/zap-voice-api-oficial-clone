import asyncio
import os
from playwright.async_api import async_playwright

async def run():
    target_dir = r"C:\Users\aryar\.gemini\antigravity\brain\22f760d7-a9ce-4ff0-ba27-d5219aa98316\.tempmediaStorage"
    os.makedirs(target_dir, exist_ok=True)
    screenshot_modal = os.path.join(target_dir, "media_results_modal_stable.png")

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

        print("3. Abrindo página de Histórico de Importação no Sidebar...")
        history_btn = await page.query_selector("aside button:has-text('Histórico importação')")
        if history_btn:
            await history_btn.click(force=True)
            await page.wait_for_timeout(2000)

        print("4. Clicando no botão 'Ver quem foi importado/rejeitado'...")
        results_btn = await page.query_selector("button:has-text('Ver quem foi importado/rejeitado')")
        if results_btn:
            await results_btn.click(force=True)
            await page.wait_for_timeout(2000)

        print("5. Capturando screenshot do Modal de Detalhes estável...")
        await page.screenshot(path=screenshot_modal)
        print("OK: Screenshot capturado com sucesso!")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
