import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        # Launch browser
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        console_errors = []
        page.on("console", lambda msg: console_errors.append(f"[{msg.type}] {msg.text}") if msg.type in ["error", "pageerror"] else None)
        page.on("pageerror", lambda err: console_errors.append(f"[pageerror] {err}"))
        
        print("Acessando a página de login...")
        await page.goto("http://localhost:5176")
        await page.wait_for_timeout(2000)
        
        # Fill login form
        print("Fazendo login...")
        await page.fill("input[type='email']", "aryarajmarketing@gmail.com")
        await page.fill("input[type='password']", "123456")
        await page.click("button[type='submit']")
        await page.wait_for_timeout(3000)
        
        # Navigate to templates view
        print("Navegando para Gerenciamento de Templates...")
        await page.evaluate("localStorage.setItem('currentView', 'templates')")
        await page.goto("http://localhost:5176")
        await page.wait_for_timeout(4000)
        
        # Select client with templates
        print("Selecionando cliente...")
        try:
            # Click the Client selector button (it displays the client name and ID)
            selector_btn = page.locator("button:has-text('ID:')").first
            await selector_btn.click()
            await page.wait_for_timeout(1000)
            # Find option buttons inside the dropdown menu
            options = await page.locator("div.absolute button").all()
            clicked = False
            for opt in options:
                text = await opt.inner_text()
                print(f"Opção de cliente encontrada: {text}")
                if "ID: 3" in text or "Novo Nome Admin 3" in text:
                    print(f"Selecionando cliente: {text}")
                    await opt.click()
                    await page.wait_for_timeout(4000)
                    clicked = True
                    break
            if not clicked:
                # Close dropdown if not clicked
                await selector_btn.click()
                await page.wait_for_timeout(1000)
        except Exception as e:
            print(f"Erro ao selecionar cliente: {e}")

        # Take screenshot of the template list with the new tabs
        print("Capturando tela inicial (Aba Ativos)...")
        await page.screenshot(path="screenshot_templates_ativos.png")
        
        # Locate first template card to hover and archive
        print("Procurando templates na lista...")
        # Hover the first item under the list container to show the hover buttons
        template_cards = page.locator("div.space-y-3.max-h-\\[700px\\] > div")
        count = await template_cards.count()
        print(f"Encontrados {count} templates.")
        
        if count > 0:
            first_card = template_cards.first
            # Hover over the card to make the buttons visible
            await first_card.hover()
            await page.wait_for_timeout(1000)
            
            # Take screenshot with the hover state showing the archive button
            await page.screenshot(path="screenshot_template_hover.png")
            
            # Click the archive button. It has title "Arquivar Template"
            print("Clicando no botão de arquivar...")
            archive_button = first_card.locator("button[title='Arquivar Template']")
            if await archive_button.count() > 0:
                await archive_button.click()
                print("Botão de arquivar clicado. Aguardando processamento...")
                await page.wait_for_timeout(3000)
                
                # Take screenshot after archiving
                await page.screenshot(path="screenshot_after_archive.png")
                
                # Click the "Arquivados" tab. We can find button containing "Arquivados"
                print("Clicando na aba Arquivados...")
                await page.click("button:has-text('Arquivados')")
                await page.wait_for_timeout(2000)
                
                # Take screenshot of archived tab
                await page.screenshot(path="screenshot_templates_arquivados.png")
                
                # Hover over the archived template card
                archived_cards = page.locator("div.space-y-3.max-h-\\[700px\\] > div")
                if await archived_cards.count() > 0:
                    first_archived = archived_cards.first
                    await first_archived.hover()
                    await page.wait_for_timeout(1000)
                    
                    # Click unarchive button
                    print("Desarquivando template...")
                    unarchive_button = first_archived.locator("button[title='Desarquivar Template']")
                    if await unarchive_button.count() > 0:
                        await unarchive_button.click()
                        await page.wait_for_timeout(3000)
                        
                        # Click back to "Ativos" tab
                        await page.click("button:has-text('Ativos')")
                        await page.wait_for_timeout(2000)
                        await page.screenshot(path="screenshot_templates_restored.png")
                        print("Fluxo de arquivamento/desarquivamento finalizado com sucesso!")
            else:
                print("Botão arquivar não encontrado no card.")
        else:
            print("Nenhum template ativo disponível para arquivar.")
            
        print("\n--- Console Errors/Warnings ---")
        for err in console_errors:
            print(err)
            
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
