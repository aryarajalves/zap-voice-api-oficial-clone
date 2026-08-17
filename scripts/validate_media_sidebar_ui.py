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

        # 1. Print da tela inteira (painel + sidebar de mídia)
        print("5. Capturando barra lateral...")
        screen_1 = os.path.join(artifact_dir, "05_sidebar_media_section.png")
        await page.screenshot(path=screen_1)
        print(f"Print 1 salvo em: {screen_1}")

        # 2. Clicar no botão 'Limpar Conversa' para testar se os botões da sidebar respondem
        print("6. Abrindo modal de mídias...")
        media_section = page.locator("text='Mídia, links e docs'").first
        if await media_section.is_visible():
            await media_section.click()
            await page.wait_for_timeout(1000)

            # Print do modal aberto na aba Mídia
            screen_2 = os.path.join(artifact_dir, "06_modal_media_links_docs.png")
            await page.screenshot(path=screen_2)
            print(f"Print 2 salvo em: {screen_2}")

            # Aba Documentos
            print("7. Alternando para Documentos...")
            docs_tab = page.locator("button:has-text('Documentos')").first
            if await docs_tab.is_visible():
                await docs_tab.click()
                await page.wait_for_timeout(500)
                screen_3 = os.path.join(artifact_dir, "07_modal_media_tab_docs.png")
                await page.screenshot(path=screen_3)
                print(f"Print 3 salvo em: {screen_3}")

            # Aba Links
            print("8. Alternando para Links...")
            links_tab = page.locator("button:has-text('Links')").first
            if await links_tab.is_visible():
                await links_tab.click()
                await page.wait_for_timeout(500)
                screen_4 = os.path.join(artifact_dir, "08_modal_media_tab_links.png")
                await page.screenshot(path=screen_4)
                print(f"Print 4 salvo em: {screen_4}")
        else:
            print("Aviso: 'Mídia, links e docs' não esteve visível no momento da busca")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
