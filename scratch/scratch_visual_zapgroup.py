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
        email_input = page.locator("input[type='email'], input[name='email']")
        if await email_input.count() > 0:
            print("Logging in...")
            await email_input.first.fill("aryarajmarketing@gmail.com")
            password_input = page.locator("input[type='password'], input[name='password']")
            await password_input.first.fill("123456")
            
            login_btn = page.locator("button:has-text('Entrar'), button[type='submit']")
            await login_btn.first.click()
            await page.wait_for_timeout(2500)
        
        print("Clicking sidebar menu 'Integrações Webhook'...")
        sidebar_item = page.locator("text='Integrações Webhook'").first
        if await sidebar_item.count() > 0:
            await sidebar_item.click()
            await page.wait_for_timeout(2000)
        
        print("Clicking Nova Integração...")
        nova_btn = page.locator("button:has-text('Nova Integração')").first
        if await nova_btn.count() > 0:
            await nova_btn.click()
            await page.wait_for_timeout(1500)
            
            print("Finding platform dropdown button...")
            # Click the dropdown displaying 'Hotmart' or any platform
            platform_btn = page.locator("div:has-text('PLATAFORMA DE ORIGEM') + div button, button:has-text('Hotmart')").first
            if await platform_btn.count() > 0:
                await platform_btn.click()
                await page.wait_for_timeout(800)
                
                search_box = page.locator("input[placeholder*='Buscar plataforma']")
                if await search_box.count() > 0:
                    await search_box.fill("ZapGroup")
                    await page.wait_for_timeout(800)

        screenshot_path = os.path.abspath("zapgroup_dropdown_screenshot.png")
        await page.screenshot(path=screenshot_path)
        print(f"Screenshot saved to: {screenshot_path}")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
