import asyncio
from playwright.async_api import async_playwright
import os

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1400, "height": 900})
        page = await context.new_page()

        print("1. Login...")
        await page.goto("http://localhost:5176", wait_until="networkidle")
        if await page.locator("input[type='email']").is_visible():
            await page.fill("input[type='email']", "aryarajmarketing@gmail.com")
            await page.fill("input[type='password']", "123456")
            await page.click("button[type='submit']")
            await page.wait_for_timeout(3000)

        await page.screenshot(path="debug_after_login.png")

        # Imprimir todos os textos de botões/links visíveis no sidebar/dashboard
        buttons = await page.locator("button, a, span").all_inner_texts()
        print("Elementos interativos visíveis:")
        for b in set(buttons):
            if "Email" in b or "E-mail" in b or "Template" in b or "Marketing" in b:
                print(f" -> '{b.strip()}'")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
