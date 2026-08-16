import asyncio
import os
import sys
from playwright.async_api import async_playwright

async def run():
    target_dir = r"C:\Users\aryar\.gemini\antigravity\brain\22f760d7-a9ce-4ff0-ba27-d5219aa98316\.tempmediaStorage"
    os.makedirs(target_dir, exist_ok=True)
    screenshot_path = os.path.join(target_dir, "media_keyword_trigger.png")

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

        print("3. Clicando em 'Meus Funis'...")
        funnel_menu = await page.query_selector("text='Meus Funis'")
        if funnel_menu:
            await funnel_menu.click()
            await page.wait_for_timeout(2000)

        print("4. Abrindo editor...")
        new_funnel_btn = await page.query_selector("button:has-text('Criar Novo Funil'), button:has-text('Novo Funil')")
        if new_funnel_btn:
            await new_funnel_btn.click()
            await page.wait_for_timeout(2000)

        print("5. Abrindo secao de Palavra-Chave de Ativacao...")
        kw_btn = await page.query_selector("button:has-text('Palavra-Chave de Ativação')")
        if kw_btn:
            await kw_btn.click()
            await page.wait_for_timeout(1000)

        print("6. Digitando palavras-chave com badges...")
        input_box = await page.query_selector("input[placeholder*='Digite']")
        if input_box:
            await input_box.fill("AULA VIP")
            await page.keyboard.press("Enter")
            await page.wait_for_timeout(500)
            await input_box.fill("VALIDAR")
            await page.keyboard.press("Enter")
            await page.wait_for_timeout(500)
            await input_box.fill("PROMOÇÃO")
            await page.keyboard.press("Enter")
            await page.wait_for_timeout(500)

        print(f"7. Capturando screenshot em {screenshot_path} ...")
        await page.screenshot(path=screenshot_path)
        print("OK: Screenshot com badges salvo com sucesso!")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
