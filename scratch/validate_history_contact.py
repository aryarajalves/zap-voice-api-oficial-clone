import asyncio
import os
from playwright.async_api import async_playwright

async def run():
    target_dir = r"C:\Users\aryar\.gemini\antigravity\brain\22f760d7-a9ce-4ff0-ba27-d5219aa98316\.tempmediaStorage"
    os.makedirs(target_dir, exist_ok=True)
    screenshot_path = os.path.join(target_dir, "media_history_contact.png")

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

        print("3. Clicando em 'Histórico' no menu lateral (nav)...")
        nav_history = await page.query_selector("nav button:has-text('Histórico')")
        if nav_history:
            await nav_history.click()
            await page.wait_for_timeout(2500)

        print("4. Selecionando 'Disparo de Funil' no dropdown FILTRAR POR...")
        select_elem = await page.query_selector("select:has(option[value='single'])")
        if select_elem:
            await select_elem.select_option("single")
            await page.wait_for_timeout(2000)

        print(f"5. Capturando screenshot em {screenshot_path} ...")
        await page.screenshot(path=screenshot_path)
        print("OK: Screenshot do Historico de Disparo de Funil salvo com sucesso!")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
