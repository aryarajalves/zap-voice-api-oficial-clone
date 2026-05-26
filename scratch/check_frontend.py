import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        console_errors = []
        page.on("console", lambda msg: console_errors.append(f"[{msg.type}] {msg.text}") if msg.type in ["error", "pageerror"] else None)
        page.on("pageerror", lambda err: console_errors.append(f"[pageerror] {err}"))
        
        await page.goto("http://localhost:5176")
        await page.wait_for_timeout(2000)
        
        await page.fill("input[type='email']", "aryarajmarketing@gmail.com")
        await page.fill("input[type='password']", "123456")
        await page.click("button[type='submit']")
        await page.wait_for_timeout(3000)
        
        # Navigate to integrations
        await page.evaluate("localStorage.setItem('currentView', 'integrations')")
        await page.goto("http://localhost:5176")
        await page.wait_for_timeout(3000)
        
        # Click Nova Integração
        print("Clicking Nova Integração...")
        await page.click("button:has-text('Nova Integração')")
        await page.wait_for_timeout(1000)
        
        # Type name
        print("Typing integration name...")
        await page.fill("input[placeholder='Ex: Hotmart - Produto VIP']", "Teste de Integração Playwright")
        
        # Click Novo Gatilho
        print("Clicking Novo Gatilho...")
        await page.click("button:has-text('Novo Gatilho')")
        await page.wait_for_timeout(1500)
        
        # Take screenshot of open modal with trigger
        await page.screenshot(path="screenshot_modal_trigger.png")
        print("Screenshot of modal with trigger saved.")
        
        # Click Salvar Alterações
        print("Clicking Salvar Alterações...")
        await page.click("button:has-text('Salvar Alterações')")
        await page.wait_for_timeout(4000)
        
        # Take screenshot of screen after save
        await page.screenshot(path="screenshot_after_save.png")
        print("Screenshot after save saved.")
        
        print("\n--- Console Errors/Warnings ---")
        for err in console_errors:
            print(err)
            
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
