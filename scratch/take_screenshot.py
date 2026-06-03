import asyncio
from playwright.async_api import async_playwright
import os

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        # set viewport size to 1280x800
        context = await browser.new_context(viewport={"width": 1280, "height": 1000})
        page = await context.new_page()
        
        print("Navigating to login page...")
        await page.goto("http://localhost:5176")
        await page.wait_for_timeout(3000)
        
        # Check if already logged in or if we need to input credentials
        if await page.query_selector('input[type="email"]'):
            print("Logging in...")
            await page.fill('input[type="email"]', "aryarajmarketing@gmail.com")
            await page.fill('input[type="password"]', "123456")
            await page.click('button[type="submit"]')
            await page.wait_for_timeout(4000)
            
        print("Current URL after login:", page.url)
        
        # Click client selector dropdown button to ensure Fonte Oculta is selected
        print("Checking active client...")
        await page.wait_for_selector("div.relative.px-4.py-3")
        active_client_text = await page.inner_text("div.relative.px-4.py-3")
        print("Active Client Section text:", active_client_text)
        
        # Let's go to Disparo em Massa
        print("Clicking Disparo em Massa...")
        disparo_btn = await page.query_selector("button:has-text('Disparo em Massa')")
        if not disparo_btn:
            disparo_btn = await page.query_selector("a:has-text('Disparo em Massa')")
        if not disparo_btn:
            body_text = await page.evaluate("() => document.body.innerHTML")
            # Click by text using locator
            await page.get_by_text("Disparo em Massa").first.click()
        else:
            await disparo_btn.click()
            
        await page.wait_for_timeout(5000) # Wait longer for templates to load from API
        
        # Open template selection dropdown
        print("Opening template dropdown...")
        dropdown_trigger = await page.query_selector("div.template-dropdown-container div")
        if dropdown_trigger:
            await dropdown_trigger.click()
            print("Dropdown clicked!")
            await page.wait_for_timeout(2000)
        else:
            print("Dropdown trigger not found!")
            
        # Take a beautiful screenshot showing the list of templates with 📌
        screenshot_path = "C:\\Users\\aryar\\.gemini\\antigravity\\brain\\1ba7dfb9-feaa-4acf-a88a-40f740aba160\\pinned_template_in_bulksender_dropdown.png"
        await page.screenshot(path=screenshot_path)
        print(f"Screenshot successfully saved to {screenshot_path}")
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
