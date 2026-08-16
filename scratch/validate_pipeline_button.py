import asyncio
import os
from playwright.async_api import async_playwright

async def run():
    target_dir = r"C:\Users\aryar\.gemini\antigravity\brain\22f760d7-a9ce-4ff0-ba27-d5219aa98316\.tempmediaStorage"
    os.makedirs(target_dir, exist_ok=True)
    screenshot_banner = os.path.join(target_dir, "media_chat_pipeline_button.png")
    screenshot_pipeline_modal = os.path.join(target_dir, "media_chat_pipeline_modal_opened.png")

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

        print("3. Abrindo Painel de Atendimento (Chat)...")
        chat_btn = await page.query_selector("button:has-text('Atendimento'), nav button:has-text('Chat'), button:has-text('Conversas')")
        if chat_btn:
            await chat_btn.click(force=True)
            await page.wait_for_timeout(2000)

        print("4. Selecionando a conversa 'Aryaraj'...")
        convo_card = await page.query_selector("div.cursor-pointer:has-text('Aryaraj'), div.group\\/convo")
        if convo_card:
            await convo_card.click(force=True)
            await page.wait_for_timeout(2000)

        print("5. Abrindo modal de disparar funil...")
        funnel_trigger_btn = await page.query_selector("button[title*='Funil'], button:has-text('Funil')")
        if funnel_trigger_btn:
            await funnel_trigger_btn.click(force=True)
            await page.wait_for_timeout(1000)

            print("6. Selecionando o primeiro funil...")
            await page.click("text=Funil - Como funciona Combo", force=True)
            await page.wait_for_timeout(800)

            print("7. Disparando funil...")
            await page.click("button:has-text('Disparar Funil')", force=True)
            await page.wait_for_timeout(3000)

        print("8. Capturando screenshot do banner com o botão 'Ver Pipeline'...")
        await page.screenshot(path=screenshot_banner)
        print("OK: Screenshot do banner capturado!")

        print("9. Clicando no botão 'Ver Pipeline'...")
        ver_pipeline_btn = await page.query_selector("button:has-text('Ver Pipeline')")
        if ver_pipeline_btn:
            await ver_pipeline_btn.click(force=True)
            await page.wait_for_timeout(3000)
            print("10. Capturando screenshot do Modal do Pipeline aberto em tempo real...")
            await page.screenshot(path=screenshot_pipeline_modal)
            print("OK: Screenshot do Modal do Pipeline capturado com sucesso!")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
