from playwright.async_api import async_playwright
import asyncio

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        await page.goto("http://localhost:5176/c/test-mentoria-1", wait_until="networkidle")
        await page.screenshot(path=r"C:\Users\aryar\.gemini\antigravity\brain\d7068606-e19f-477d-a8b9-d1e7aed29794\public_checkout_page.png", full_page=True)
        await browser.close()
        print("Screenshot captured successfully!")

if __name__ == "__main__":
    asyncio.run(main())
