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

        # Clicar no menu Chat / Atendimento (se não for a rota padrão)
        print("3. Navegando para atendimento...")
        # Localiza link ou item de menu de chat/atendimento
        chat_nav = page.locator("a[href*='chat'], button:has-text('Atendimento'), button:has-text('Chat')").first
        if await chat_nav.is_visible():
            await chat_nav.click()
            await page.wait_for_timeout(2000)

        # Clicar na primeira conversa da lista se houver
        print("4. Selecionando uma conversa...")
        first_convo = page.locator(".group\\/convo, div[class*='group/convo']").first
        if await first_convo.is_visible():
            await first_convo.click()
            await page.wait_for_timeout(1500)

        # Captura screenshot da tela com a conversa aberta e o botão "Limpar Conversa" na sidebar direita
        screen_1 = os.path.join(artifact_dir, "01_chat_sidebar_limpar_conversa.png")
        await page.screenshot(path=screen_1)
        print(f"Print 1 salvo em: {screen_1}")

        # Clicar no botão "Limpar Conversa" na barra lateral
        print("5. Clicando no botão 'Limpar Conversa'...")
        clear_btn = page.locator("button:has-text('Limpar Conversa')")
        if await clear_btn.is_visible():
            await clear_btn.click()
            await page.wait_for_timeout(1000)

            # Captura screenshot do popup/modal de confirmação aberto
            screen_2 = os.path.join(artifact_dir, "02_popup_confirmacao_limpar_conversa.png")
            await page.screenshot(path=screen_2)
            print(f"Print 2 (Modal de confirmação) salvo em: {screen_2}")
        else:
            print("Botão 'Limpar Conversa' não encontrado!")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
