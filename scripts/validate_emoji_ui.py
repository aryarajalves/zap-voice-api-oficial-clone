import asyncio
from playwright.async_api import async_playwright
import os

async def run():
    artifact_dir = r"C:\Users\aryar\.gemini\antigravity\brain\4a75ffc9-5c8c-447f-84e1-7dcad03657b3"
    os.makedirs(artifact_dir, exist_ok=True)
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1440, "height": 900})
        page = await context.new_page()

        print("1. Acessando http://localhost:5176...")
        await page.goto("http://localhost:5176", wait_until="domcontentloaded", timeout=60000)
        await page.wait_for_timeout(3000)

        # Fazer login
        if await page.locator("input[type='email']").is_visible():
            print("2. Efetuando login...")
            await page.fill("input[type='email']", "aryarajmarketing@gmail.com")
            await page.fill("input[type='password']", "123456")
            await page.click("button[type='submit']")
            await page.wait_for_timeout(3000)

        # Clicar no menu Chat / Atendimento (se necessário)
        print("3. Navegando para atendimento...")
        chat_nav = page.locator("a[href*='chat'], button:has-text('Atendimento'), button:has-text('Chat')").first
        if await chat_nav.is_visible():
            await chat_nav.click()
            await page.wait_for_timeout(2000)

        # Clicar na primeira conversa da lista se houver
        print("4. Selecionando conversa...")
        first_convo = page.locator(".group\\/convo, div[class*='group/convo']").first
        if await first_convo.is_visible():
            await first_convo.click()
            await page.wait_for_timeout(2000)

        # 1. Abrir seletor de emojis no input normal
        print("5. Clicando no botão de emojis (input normal)...")
        emoji_btn_normal = page.locator("button[title='Escolher Emoji']").first
        if await emoji_btn_normal.is_visible():
            await emoji_btn_normal.click()
            await page.wait_for_timeout(1000)

            # Print do picker no input normal
            screen_1 = os.path.join(artifact_dir, "03_emoji_picker_normal.png")
            await page.screenshot(path=screen_1)
            print(f"Print 1 salvo em: {screen_1}")

            # Inserir emoji
            first_emoji = page.locator("[data-testid='emoji-item']").first
            if await first_emoji.is_visible():
                await first_emoji.click()
                await page.wait_for_timeout(500)

        # 2. Abrir input maximizado
        print("6. Abrindo modal maximizado...")
        maximize_btn = page.locator("button[title='Maximizar campo de texto']").first
        if await maximize_btn.is_visible():
            await maximize_btn.click()
            await page.wait_for_timeout(1500)

            # Clicar no botão Emojis dentro do modal maximizado
            print("7. Clicando no botão Emojis dentro do modal maximizado...")
            emoji_btn_max = page.locator("button:has-text('Emojis')").first
            if await emoji_btn_max.is_visible():
                await emoji_btn_max.click()
                await page.wait_for_timeout(1000)

                # Print do picker no input maximizado
                screen_2 = os.path.join(artifact_dir, "04_emoji_picker_maximizado.png")
                await page.screenshot(path=screen_2)
                print(f"Print 2 salvo em: {screen_2}")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
