import asyncio
from playwright.async_api import async_playwright
import os

async def main():
    print("Iniciando browser...")
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        # Configurando um viewport adequado para o modal de configurações
        await page.set_viewport_size({"width": 1280, "height": 900})
        
        # 1. Faça login em http://localhost:5176 com aryarajmarketing@gmail.com / 123456.
        print("Navegando para o ZapVoice...")
        await page.goto("http://localhost:5176", wait_until="networkidle", timeout=30000)
        
        print("Realizando login...")
        await page.locator('input[type="email"]').first.fill('aryarajmarketing@gmail.com')
        await page.locator('input[type="password"]').first.fill('123456')
        await page.locator('button[type="submit"], button:has-text("Entrar")').first.click()
        
        # 2. Aguarde 3 segundos. Clicar no botão 'Configurações' no canto inferior esquerdo para abrir a modal de configurações.
        print("Aguardando 3 segundos pós-login...")
        await page.wait_for_timeout(3000)
        
        # Selecionar cliente se não houver um ativo para garantir que o painel e os botões carreguem perfeitamente
        has_no_client = await page.locator('button:has-text("Sem cliente selecionado")').count()
        if has_no_client > 0:
            print("Nenhum cliente ativo. Selecionando o primeiro disponível...")
            await page.locator('button:has-text("Sem cliente selecionado")').click()
            await page.wait_for_timeout(1000)
            await page.locator('div.max-h-60 button').first.click()
            await page.wait_for_timeout(3000)
            
        print("Clicando no botão 'Configurações' no canto inferior esquerdo...")
        await page.locator('button:has-text("Configurações")').click()
        
        # 3. Aguarde 2 segundos. Clicar no botão/aba 'Marcadores' na barra lateral esquerda da modal de configurações.
        print("Aguardando 2 segundos para renderização do modal...")
        await page.wait_for_timeout(2000)
        
        print("Clicando na aba 'Marcadores'...")
        # Localize a aba de marcadores. Pode ser um botão ou elemento contendo "Marcadores" dentro da barra lateral.
        # Vamos tentar localizar 'Marcadores' na barra lateral
        await page.locator('button:has-text("Marcadores"), div:has-text("Marcadores")').last.click()
        
        # 4. Aguarde 3 segundos para que as etiquetas cadastradas carreguem.
        print("Aguardando 3 segundos para carregamento das etiquetas...")
        await page.wait_for_timeout(3000)
        
        # 5. Salve uma screenshot da modal focando na aba de marcadores para mostrar o novo botão de Edição (lápis) ao lado da lixeira em cada card de etiqueta.
        screenshot_path = r"C:\Users\aryar\.gemini\antigravity\brain\e2932a69-fc4b-4f16-8ccc-e5edbd95d2a4\edit_labels_ui_verified.png"
        os.makedirs(os.path.dirname(screenshot_path), exist_ok=True)
        
        print(f"Salvando screenshot em {screenshot_path}...")
        await page.screenshot(path=screenshot_path)
        
        await browser.close()
        print("Execução finalizada com sucesso!")

if __name__ == "__main__":
    asyncio.run(main())
