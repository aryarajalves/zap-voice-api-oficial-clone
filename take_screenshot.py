import asyncio
from playwright.async_api import async_playwright
import os

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={'width': 1280, 'height': 800})
        page = await context.new_page()
        
        print("Navigating to http://localhost:5176 ...")
        await page.goto("http://localhost:5176", wait_until="networkidle")
        await page.wait_for_timeout(1000)
        
        # Login
        print("Logging in...")
        email_input = page.locator("input[type='email'], input[name='email']")
        if await email_input.count() > 0:
            await email_input.first.fill("aryarajmarketing@gmail.com")
            password_input = page.locator("input[type='password'], input[name='password']")
            await password_input.first.fill("123456")
            
            login_btn = page.locator("button:has-text('Entrar'), button[type='submit']")
            await login_btn.first.click()
            await page.wait_for_timeout(3000)
            await page.wait_for_load_state("networkidle")
        
        print("Navigating directly to E-mail Marketing view via hash #/email-marketing...")
        await page.goto("http://localhost:5176/#/email-marketing", wait_until="networkidle")
        await page.wait_for_timeout(2000)
        
        # If hashtag route isn't used, click on the sidebar item carefully
        email_heading = page.locator("h1:has-text('E-mail Marketing')")
        if await email_heading.count() == 0:
            print("Clicking sidebar menu for E-mail Marketing...")
            await page.locator("nav, aside").locator("text=E-mail Marketing").click()
            await page.wait_for_timeout(2000)

        # Tab 'Disparo em Massa' in EmailMarketingMain
        print("Ensuring 'Disparo em Massa' tab is active...")
        disparo_tab = page.locator("button:has-text('Disparo em Massa')").first
        if await disparo_tab.count() > 0:
            await disparo_tab.click()
            await page.wait_for_timeout(1000)
            
        print("Locating SearchableTagSelect dropdown...")
        # Search for tag dropdown button, which displays 'Todas as etiquetas (Sem filtro)'
        tag_dropdown_btn = page.locator("button:has-text('Todas as etiquetas (Sem filtro)')")
        if await tag_dropdown_btn.count() == 0:
            tag_dropdown_btn = page.locator("label:has-text('Etiqueta da Aba de Contatos')").locator("..").locator("button")

        if await tag_dropdown_btn.count() > 0:
            print("Clicking Tag Dropdown...")
            await tag_dropdown_btn.first.click()
            await page.wait_for_timeout(1000)
        else:
            print("Tag dropdown button not found!")

        screenshot_path = os.path.abspath("screenshot_tag_dropdown.png")
        await page.screenshot(path=screenshot_path)
        print(f"Screenshot saved to: {screenshot_path}")
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
