# -*- coding: utf-8 -*-
import asyncio
import os
from playwright.async_api import async_playwright

ARTIFACT_DIR = r"C:\Users\aryar\.gemini\antigravity\brain\c98ffa8c-6962-47ab-81d0-b67155534b39"

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={'width': 1440, 'height': 900})
        page = await context.new_page()
        await page.goto("http://localhost:5176", wait_until="networkidle")
        await page.wait_for_timeout(1000)

        email_input = page.locator("input[type='email'], input[name='email']")
        if await email_input.count() > 0:
            await email_input.first.fill("aryarajmarketing@gmail.com")
            await page.locator("input[type='password'], input[name='password']").first.fill("123456")
            await page.locator("button:has-text('Entrar'), button[type='submit']").first.click()
            await page.wait_for_timeout(2500)
        # Switch client to 'Cliente - Crassus' if needed
        print("Checking active client...")
        client_selector_btn = page.locator("label:has-text('Cliente Ativo')").locator("..").locator("button").first
        if await client_selector_btn.count() > 0:
            btn_text = await client_selector_btn.inner_text()
            print(f"Current client: {btn_text}")
            if "Crassus" not in btn_text:
                print("Switching client to 'Cliente - Crassus'...")
                await client_selector_btn.click()
                await page.wait_for_timeout(500)
                crassus_opt = page.locator("button").filter(has_text="Crassus").first
                await crassus_opt.click()
                await page.wait_for_timeout(2000)

        integracoes_nav = page.locator("button").filter(has_text="Integra").first
        await integracoes_nav.scroll_into_view_if_needed()
        await integracoes_nav.click()
        await page.wait_for_timeout(2500)

        disparos_btn = page.locator("table button").filter(has_text="Disparos").first
        await disparos_btn.wait_for(state="visible", timeout=10000)
        await disparos_btn.click()
        await page.wait_for_timeout(2500)

        shot = os.path.join(ARTIFACT_DIR, "modal_filters_before.png")
        await page.screenshot(path=shot)
        print("Saved:", shot)
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
