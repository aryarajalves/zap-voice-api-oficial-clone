from playwright.async_api import async_playwright
import asyncio

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        # Login
        await page.goto("http://localhost:5176", wait_until="networkidle")
        await page.fill('input[type="email"]', "aryarajmarketing@gmail.com")
        await page.fill('input[type="password"]', "123456")
        await page.click('button[type="submit"]')
        await page.wait_for_timeout(2000)

        # Navigate to Checkout Prepopulado
        await page.click('text="Checkout Prepopulado"')
        await page.wait_for_timeout(1500)

        # Take screenshot of Tab 1 (Configurações)
        await page.screenshot(path=r"C:\Users\aryar\.gemini\antigravity\brain\d7068606-e19f-477d-a8b9-d1e7aed29794\tab_config_page.png", full_page=True)

        # Click on Tab 2 (Leads Capturados)
        await page.click('text="Leads Capturados"')
        await page.wait_for_timeout(1000)
        await page.screenshot(path=r"C:\Users\aryar\.gemini\antigravity\brain\d7068606-e19f-477d-a8b9-d1e7aed29794\tab_leads_page.png", full_page=True)

        # Click delete button to open modal
        delete_btns = await page.query_selector_all('button[title="Excluir Lead"]')
        if delete_btns:
            await delete_btns[0].click()
            await page.wait_for_timeout(500)
            await page.screenshot(path=r"C:\Users\aryar\.gemini\antigravity\brain\d7068606-e19f-477d-a8b9-d1e7aed29794\delete_modal_full_screen.png", full_page=True)

        await browser.close()
        print("Screenshots captured successfully!")

if __name__ == "__main__":
    asyncio.run(main())
