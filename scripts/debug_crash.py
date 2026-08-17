import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        def safe_log(msg):
            try:
                text = msg.text.encode('ascii', 'replace').decode('ascii')
                print(f"[{msg.type}] {text}")
            except Exception:
                pass

        def safe_error(err):
            try:
                text = str(err).encode('ascii', 'replace').decode('ascii')
                print(f"[FATAL PAGE ERROR] {text}")
            except Exception:
                pass

        page.on("console", safe_log)
        page.on("pageerror", safe_error)
        
        await page.goto("http://localhost:5176", wait_until="networkidle")
        if await page.locator("input[type='email']").is_visible():
            await page.fill("input[type='email']", "aryarajmarketing@gmail.com")
            await page.fill("input[type='password']", "123456")
            await page.click("button[type='submit']")
            await page.wait_for_timeout(3000)
            
        print("Clicando no item 'Atendimento'...")
        atendimento_btn = page.locator("aside button:has-text('Atendimento'), aside a:has-text('Atendimento')").first
        await atendimento_btn.click()
        await page.wait_for_timeout(3000)
        
        print("Capturando screenshot do estado atual...")
        await page.screenshot(path="crash_screenshot.png")
        print("Screenshot capturado com sucesso.")
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
