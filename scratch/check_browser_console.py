from playwright.async_api import async_playwright
import asyncio

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        errors = []
        logs = []

        page.on("console", lambda msg: logs.append(f"CONSOLE [{msg.type}]: {msg.text}"))
        page.on("pageerror", lambda err: errors.append(f"PAGE ERROR: {err}"))

        await page.goto("http://localhost:5176", wait_until="networkidle")

        print("=== CONSOLE LOGS ===")
        for log in logs:
            print(log)

        print("\n=== PAGE ERRORS ===")
        for err in errors:
            print(err)

        await page.screenshot(path=r"C:\Users\aryar\.gemini\antigravity\brain\d7068606-e19f-477d-a8b9-d1e7aed29794\dashboard_white_screen.png")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
