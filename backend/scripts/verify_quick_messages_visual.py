import asyncio
from playwright.async_api import async_playwright
import os

async def main():
    artifact_dir = r"C:\Users\aryar\.gemini\antigravity\brain\1c038e5c-7025-44b5-ba0e-625018ad354b"
    os.makedirs(artifact_dir, exist_ok=True)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1440, "height": 900})
        page = await context.new_page()

        print("[1] Acessando http://localhost:5176/login...")
        await page.goto("http://localhost:5176/login", wait_until="domcontentloaded")
        await asyncio.sleep(2)

        print("[2] Fazendo login...")
        await page.fill("input[type='email']", "aryarajmarketing@gmail.com")
        await page.fill("input[type='password']", "123456")
        await page.click("button[type='submit']")
        await asyncio.sleep(3)

        print("[3] Abrindo Configurações...")
        settings_btn = page.locator("button:has-text('Configurações')").first
        if await settings_btn.count() > 0:
            await settings_btn.click()
            await asyncio.sleep(1.5)

            quick_tab = page.locator("button:has-text('Mensagens Rápidas')").first
            if await quick_tab.count() > 0:
                await quick_tab.click()
                await asyncio.sleep(2)

            screenshot_path1 = os.path.join(artifact_dir, "configuracoes_mensagens_rapidas_tab.png")
            await page.screenshot(path=screenshot_path1)
            print(f"[OK] Print 1 salvo: {screenshot_path1}")

            close_btn = page.locator("button:has-text('Fechar')").first
            if await close_btn.count() > 0:
                await close_btn.click()
                await asyncio.sleep(1)

        print("[4] Clicando na aba Atendimento...")
        atendimento_btn = page.locator("button:has-text('Atendimento')").first
        if await atendimento_btn.count() > 0:
            await atendimento_btn.click()
            await asyncio.sleep(3)

        print("[5] Selecionando conversa...")
        convo_cards = page.locator("div[class*='cursor-pointer']:has(h4), div[class*='cursor-pointer']:has(span.font-medium)")
        if await convo_cards.count() > 0:
            await convo_cards.first.click()
            await asyncio.sleep(2)

        print("[6] Digitando '/' no campo de mensagem para abrir o QuickRepliesDropdown...")
        chat_textarea = page.locator("textarea[placeholder*='Digite sua mensagem']").first
        if await chat_textarea.count() > 0:
            await chat_textarea.click()
            await chat_textarea.focus()
            await chat_textarea.press_sequentially("/", delay=100)
            await asyncio.sleep(2)

            screenshot_path2 = os.path.join(artifact_dir, "chat_dropdown_barra_mensagens_rapidas.png")
            await page.screenshot(path=screenshot_path2)
            print(f"[OK] Print 2 salvo: {screenshot_path2}")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
