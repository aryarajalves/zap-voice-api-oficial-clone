import asyncio
from playwright.async_api import async_playwright
import os

async def main():
    print("Iniciando browser...")
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        # Configurando um viewport adequado
        await page.set_viewport_size({"width": 1280, "height": 900})
        
        # 1. Navegar para a aplicação
        print("Navegando para o ZapVoice...")
        await page.goto("http://localhost:5176", wait_until="networkidle", timeout=30000)
        
        # 2. Fazer login se necessário
        try:
            print("Verificando se tela de login está ativa...")
            email_input = page.locator('input[type="email"]').first
            await email_input.wait_for(timeout=3000)
            print("Realizando login...")
            await email_input.fill('aryarajmarketing@gmail.com')
            await page.locator('input[type="password"]').first.fill('123456')
            await page.locator('button[type="submit"], button:has-text("Entrar")').first.click()
            print("Login submetido. Aguardando 3 segundos...")
            await page.wait_for_timeout(3000)
        except Exception as e:
            print("Não foi necessária a tela de login ou houve timeout:", e)
        
        # 3. Selecionar cliente se não houver um ativo
        try:
            has_no_client = await page.locator('button:has-text("Sem cliente selecionado")').count()
            if has_no_client > 0:
                print("Nenhum cliente ativo. Selecionando o primeiro disponível...")
                await page.locator('button:has-text("Sem cliente selecionado")').click()
                await page.wait_for_timeout(1500)
                await page.locator('div.max-h-60 button').first.click()
                await page.wait_for_timeout(3000)
        except Exception as e:
            print("Erro ao selecionar cliente:", e)
            
        # 4. Navegar até a aba Histórico
        print("Clicando no botão 'Histórico' no menu lateral...")
        await page.locator('button:text-is("Histórico")').first.click()
        
        # 5. Aguardar carregar e estabilizar a tela
        print("Aguardando 5 segundos para carregar o histórico de disparos...")
        await page.wait_for_timeout(5000)
        
        # 6. Salvar screenshot na pasta de artefatos especificada
        screenshot_path = r"C:\Users\aryar\.gemini\antigravity\brain\7ec2a63c-b9d4-4de2-a436-128ae315c9f2\historico_disparos.png"
        os.makedirs(os.path.dirname(screenshot_path), exist_ok=True)
        
        print(f"Salvando screenshot em {screenshot_path}...")
        await page.screenshot(path=screenshot_path)
        
        await browser.close()
        print("Execução finalizada com sucesso!")

if __name__ == "__main__":
    asyncio.run(main())
