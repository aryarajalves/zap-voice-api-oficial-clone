import asyncio
from playwright.async_api import async_playwright
import os

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={'width': 1366, 'height': 768})
        page = await context.new_page()
        
        print("Acessando http://localhost:5176 ...")
        await page.goto("http://localhost:5176", wait_until="networkidle")
        await page.wait_for_timeout(1000)
        
        # Login
        email_input = page.locator("input[type='email'], input[name='email']")
        if await email_input.count() > 0:
            print("Efetuando login...")
            await email_input.first.fill("aryarajmarketing@gmail.com")
            password_input = page.locator("input[type='password'], input[name='password']")
            await password_input.first.fill("123456")
            
            login_btn = page.locator("button:has-text('Entrar'), button[type='submit']")
            await login_btn.first.click()
            await page.wait_for_timeout(3000)
            await page.wait_for_load_state("networkidle")
        
        # Clicar no menu lateral "Atendimento"
        print("Navegando para 'Atendimento'...")
        atendimento_btn = page.locator("text='Atendimento'").first
        if await atendimento_btn.count() > 0:
            await atendimento_btn.click()
            await page.wait_for_timeout(2000)

        # Selecionar primeira conversa (ex: Aryaraj)
        convo_item = page.locator("div.cursor-pointer").first
        if await convo_item.count() > 0:
            print("Abrindo primeira conversa na lista...")
            await convo_item.click()
            await page.wait_for_timeout(2000)

            img1_path = os.path.abspath("scratch_chat_open_before_close.png")
            await page.screenshot(path=img1_path)
            print(f"Screenshot 1 (Conversa Aberta) salvo em: {img1_path}")

            # Clicar no botão 'Fechar conversa'
            close_btn = page.locator("button[title='Fechar conversa']")
            if await close_btn.count() > 0:
                print("Clicando no botão 'Fechar conversa'...")
                await close_btn.click()
                await page.wait_for_timeout(1500)

                img2_path = os.path.abspath("scratch_chat_closed_after_close.png")
                await page.screenshot(path=img2_path)
                print(f"Screenshot 2 (Área Livre Após Fechar) salvo em: {img2_path}")
            else:
                print("Botão 'Fechar conversa' não encontrado!")
        else:
            print("Nenhuma conversa encontrada para selecionar.")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
