import asyncio
from playwright.async_api import async_playwright
import os

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        print("Navegando para o ZapVoice...")
        await page.goto("http://localhost:5176", wait_until="networkidle", timeout=30000)
        
        print("Realizando login...")
        await page.locator('input[type="email"]').first.fill('aryarajmarketing@gmail.com')
        await page.locator('input[type="password"]').first.fill('123456')
        await page.locator('button[type="submit"], button:has-text("Entrar")').first.click()
        
        print("Aguardando painel principal...")
        await page.wait_for_timeout(6000)
        
        # Seleciona o cliente para habilitar o painel
        print("Selecionando cliente...")
        selector_button = page.locator('button:has-text("Sem cliente selecionado"), button:has-text("ID:")').first
        await selector_button.click()
        await page.wait_for_timeout(1000)
        await page.locator('div.max-h-60 button').first.click()
        await page.wait_for_timeout(4000)

        
        await page.set_viewport_size({"width": 1280, "height": 900})

        
        print("Navegando para Backup Banco via Sidebar...")
        await page.locator('aside button:has-text("Backup Banco"), button:has-text("Backup Banco")').first.click()
        await page.wait_for_timeout(4000)


        # Dispara backup manual para criar um com o novo formato
        print("Disparando backup manual...")
        await page.locator('#btn-run-backup-now').first.click()
        await page.wait_for_timeout(5000)
        
        # Atualiza a lista
        print("Atualizando a lista...")
        await page.locator('#btn-refresh-backups').click()
        await page.wait_for_timeout(4000)
        
        # Clica no dropdown de itens por página para mostrar no screenshot as opções com o novo estilo de cores legíveis
        print("Focando no dropdown de exibir...")
        await page.locator('#select-items-per-page').focus()
        await page.wait_for_timeout(1000)
        
        screenshot_path = r"C:\Users\aryar\.gemini\antigravity\brain\60bf575c-763c-4495-8ac5-c73f2ee61807\backup_validation.png"
        print(f"Salvando screenshot em {screenshot_path}...")
        await page.screenshot(path=screenshot_path)
        
        await browser.close()
        print("Concluído!")

if __name__ == "__main__":
    asyncio.run(main())
