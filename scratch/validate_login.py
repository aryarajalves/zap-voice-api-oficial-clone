import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        print("Acessando http://localhost:5176 ...")
        await page.goto("http://localhost:5176")
        
        # Preencher e-mail e senha
        print("Preenchendo credenciais...")
        await page.fill("input[type='email'], input[name='email']", "aryarajmarketing@gmail.com")
        await page.fill("input[type='password']", "123456")
        
        # Clicar no botão entrar
        print("Clicando em Entrar...")
        await page.click("button[type='submit'], button:has-text('Entrar')")
        
        # Aguardar tempo para redirecionamento e requisições
        await page.wait_for_timeout(5000)
        
        current_url = page.url
        print(f"URL atual: {current_url}")
        
        # Capturar screenshot
        screenshot_path = r"c:\Users\aryar\.gemini\antigravity\scratch\Projetos Serios\Projeto - ZapVoice no Chatwoot\screenshot_login_validation.png"
        await page.screenshot(path=screenshot_path, full_page=True)
        print(f"Screenshot salvo em: {screenshot_path}")
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
