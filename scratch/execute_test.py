import asyncio
import os
from playwright.async_api import async_playwright

async def run():
    target_dir = r"C:\Users\aryar\.gemini\antigravity\brain\14079945-e400-4fbf-bf26-2ab770032352"
    os.makedirs(target_dir, exist_ok=True)
    
    screenshot_1 = os.path.join(target_dir, "screenshot_teste_escala_template_dark.png")
    screenshot_2 = os.path.join(target_dir, "screenshot_trigger_history_economy.png")

    async with async_playwright() as p:
        print("Launching browser...")
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width": 1280, "height": 800})
        
        print("Navigating to login page...")
        await page.goto("http://localhost:5176")
        await page.wait_for_timeout(2000)
        
        print("Filling credentials...")
        await page.fill("input[type='email']", "aryarajmarketing@gmail.com")
        await page.fill("input[type='password']", "123456")
        await page.click("button[type='submit']")
        await page.wait_for_timeout(3000)
        
        print("Navigating to 'Teste de Escala'...")
        # Set active view in localStorage and reload to ensure we are on the page directly
        await page.evaluate("localStorage.setItem('currentView', 'stress_test')")
        # Ensure dark mode is active in localStorage and classList
        await page.evaluate("localStorage.setItem('theme', 'dark')")
        await page.evaluate("document.documentElement.classList.add('dark')")
        await page.goto("http://localhost:5176")
        await page.wait_for_timeout(3000)
        
        # Make sure dark mode is still applied
        await page.evaluate("document.documentElement.classList.add('dark')")
        
        # Click on 'Template' button
        print("Switching type to Template...")
        # Let's locate the Template button. Line 270 in StressTest.jsx: type="button" text "Template"
        await page.click("button:has-text('Template')")
        await page.wait_for_timeout(1500)
        
        # Take screenshot 1
        print("Taking first screenshot...")
        await page.screenshot(path=screenshot_1)
        print(f"First screenshot saved to {screenshot_1}")
        
        # Go to Monitoramento
        print("Navigating to 'Monitoramento'...")
        await page.evaluate("localStorage.setItem('currentView', 'monitoring')")
        await page.goto("http://localhost:5176")
        await page.wait_for_timeout(3000)
        
        # Make sure dark mode is still applied
        await page.evaluate("document.documentElement.classList.add('dark')")
        
        # Take screenshot 2
        print("Taking second screenshot...")
        await page.screenshot(path=screenshot_2)
        print(f"Second screenshot saved to {screenshot_2}")
        
        await browser.close()
        print("Browser closed. Automation finished successfully.")

if __name__ == "__main__":
    asyncio.run(run())
