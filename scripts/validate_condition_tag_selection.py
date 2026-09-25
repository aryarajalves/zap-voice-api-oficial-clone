import asyncio
from playwright.async_api import async_playwright
import os

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        print("Navegando para o ZapVoice...")
        await page.goto("http://127.0.0.1:5176", wait_until="domcontentloaded", timeout=20000)
        await page.wait_for_timeout(3000)
        
        # Login se necessário
        email_input = page.locator('input[type="email"]').first
        if await email_input.count() > 0:
            print("Realizando login...")
            await email_input.fill('aryarajmarketing@gmail.com')
            await page.locator('input[type="password"]').first.fill('123456')
            await page.locator('button[type="submit"], button:has-text("Entrar")').first.click()
            await page.wait_for_timeout(5000)
        
        # Selecionar cliente se necessário
        selector_button = page.locator('button:has-text("Sem cliente selecionado"), button:has-text("ID:")').first
        if await selector_button.count() > 0:
            btn_text = await selector_button.inner_text()
            if "Sem cliente" in btn_text:
                await selector_button.click()
                await page.wait_for_timeout(1000)
                await page.locator('div.max-h-60 button').first.click()
                await page.wait_for_timeout(3000)
        
        await page.set_viewport_size({"width": 1280, "height": 900})
        
        # Navegar para "Meus Funis"
        print("Navegando para Meus Funis...")
        await page.locator('aside button:has-text("Meus Funis")').first.click()
        await page.wait_for_timeout(4000)
        
        # Clicar em "Novo Funil"
        print("Abrindo Novo Funil...")
        await page.locator('button:has-text("Novo Funil")').first.click()
        await page.wait_for_timeout(4000)
        
        # Clicar com botão direito para abrir context menu e adicionar Condição Inteligente
        print("Adicionando nó Condição Inteligente...")
        await page.click(".react-flow__renderer", button="right", position={"x": 500, "y": 300})
        await page.wait_for_timeout(1000)
        
        cond_btn = page.locator('button:has-text("Condição Inteligente")').first
        if await cond_btn.count() > 0:
            await cond_btn.click()
            await page.wait_for_timeout(2000)
        
        # Mudar o tipo de validação para Etiqueta no Chat (ZapVoice)
        print("Alterando tipo de validação para Etiqueta no Chat...")
        select_type = page.locator('select').first
        await select_type.select_option('tag')
        await page.wait_for_timeout(2000)
        
        # Clicar no seletor de etiqueta
        print("Abrindo seletor de etiquetas...")
        trigger = page.locator('[data-testid="condition-tag-trigger"]').first
        await trigger.click()
        await page.wait_for_timeout(1500)
        
        # Clicar na primeira opção da lista
        print("Clicando na opção de etiqueta...")
        options = page.locator('[data-testid^="condition-tag-option-"]')
        if await options.count() > 0:
            await options.first.click()
            await page.wait_for_timeout(1500)
        else:
            # Se não houver etiquetas carregadas, digita uma etiqueta personalizada
            search_input = page.locator('[data-testid="condition-tag-search-input"]')
            await search_input.fill('teste-tag')
            await page.wait_for_timeout(500)
            custom_opt = page.locator('[data-testid="condition-tag-custom-option"]')
            if await custom_opt.count() > 0:
                await custom_opt.click()
                await page.wait_for_timeout(1500)
        
        dest_path = r"C:\Users\aryar\.gemini\antigravity\brain\cd8b77a3-efbf-4889-8f89-3bbf669a5fb4\condition_tag_selected_depois.png"
        await page.screenshot(path=dest_path)
        print(f"Screenshot salvo em: {dest_path}")
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
