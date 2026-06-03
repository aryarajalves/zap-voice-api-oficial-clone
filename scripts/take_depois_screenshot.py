import asyncio
from playwright.async_api import async_playwright
import os

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        # Navigate to the page
        print("Navegando para o ZapVoice...")
        await page.goto("http://localhost:5176", wait_until="networkidle", timeout=30000)
        
        # Login
        print("Realizando login...")
        await page.locator('input[type="email"]').first.fill('aryarajmarketing@gmail.com')
        await page.locator('input[type="password"]').first.fill('123456')
        await page.locator('button[type="submit"], button:has-text("Entrar")').first.click()
        
        print("Aguardando painel principal...")
        await page.wait_for_timeout(6000)
        
        # Force select client "Fonte Oculta"
        print("Selecionando cliente...")
        selector_button = page.locator('button:has-text("Sem cliente selecionado"), button:has-text("ID:")').first
        await selector_button.click()
        await page.wait_for_timeout(1000)
        await page.locator('div.max-h-60 button:has-text("Fonte Oculta")').first.click()
        await page.wait_for_timeout(4000)
        
        # Set viewport
        await page.set_viewport_size({"width": 1280, "height": 900})
        
        # Navigate to "Meus Funis"
        print("Navegando para Meus Funis...")
        await page.locator('aside button:has-text("Meus Funis")').click()
        await page.wait_for_timeout(3000)
        
        # Click "Novo Funil"
        print("Criando novo funil...")
        await page.locator('button:has-text("Novo Funil")').click()
        await page.wait_for_timeout(4000)
        
        # Right click on ReactFlow renderer
        print("Abrindo menu de contexto...")
        await page.click(".react-flow__renderer", button="right", position={"x": 400, "y": 400})
        await page.wait_for_timeout(1000)
        
        # Add "Etiquetar Chatwoot" node
        print("Adicionando nó Etiquetar Chatwoot...")
        await page.click('button:has-text("Etiquetar Chatwoot")')
        await page.wait_for_timeout(2000)
        
        # Open dropdown
        print("Abrindo seletor de etiquetas...")
        await page.click('[data-testid="chatwoot-label-dropdown-trigger"]')
        await page.wait_for_timeout(1000)
        
        # Type to filter
        print("Filtrando etiquetas...")
        await page.fill('[data-testid="chatwoot-label-search-input"]', "lead")
        await page.wait_for_timeout(2000)
        
        # Take screenshot
        os.makedirs(r"C:\Users\aryar\.gemini\antigravity\scratch", exist_ok=True)
        screenshot_path = r"C:\Users\aryar\.gemini\antigravity\scratch\depois.png"
        print(f"Salvando screenshot em {screenshot_path}...")
        await page.screenshot(path=screenshot_path)
        
        await browser.close()
        print("Concluído!")

if __name__ == "__main__":
    asyncio.run(main())
