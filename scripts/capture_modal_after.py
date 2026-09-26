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
        await page.goto("http://localhost:5176", wait_until="domcontentloaded")
        await page.wait_for_timeout(1000)

        # Login if needed
        email_input = page.locator("input[type='email'], input[name='email']")
        if await email_input.count() > 0:
            await email_input.first.fill("aryarajmarketing@gmail.com")
            await page.locator("input[type='password'], input[name='password']").first.fill("123456")
            await page.locator("button:has-text('Entrar'), button[type='submit']").first.click()
            await page.wait_for_timeout(2500)

        # Switch client to 'Cliente - Crassus' if needed
        client_selector_btn = page.locator("label:has-text('Cliente Ativo')").locator("..").locator("button").first
        if await client_selector_btn.count() > 0:
            btn_text = await client_selector_btn.inner_text()
            if "Crassus" not in btn_text:
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

        # Screenshot 1: Collapsed state (clean, organized bar)
        shot1 = os.path.join(ARTIFACT_DIR, "modal_filters_after_collapsed.png")
        await page.screenshot(path=shot1)
        print("Screenshot 1 saved:", shot1)

        # Click on "Filtros Avançados" button
        advanced_btn = page.locator("button:has-text('Filtros Avançados')").first
        await advanced_btn.wait_for(state="visible", timeout=5000)
        await advanced_btn.click()
        await page.wait_for_timeout(800)

        # Screenshot 2: Expanded state showing all advanced filters
        shot2 = os.path.join(ARTIFACT_DIR, "modal_filters_after_expanded.png")
        await page.screenshot(path=shot2)
        print("Screenshot 2 saved:", shot2)

        # Select a date or type to show active badge
        desde_input = page.locator("input[aria-label='Data inicial']").first
        if await desde_input.count() > 0:
            await desde_input.fill("2026-09-01")
            await page.wait_for_timeout(500)

        # Click advanced button to collapse and verify active badge
        await advanced_btn.click()
        await page.wait_for_timeout(800)

        # Screenshot 3: Active filter badge visible on collapsed button
        shot3 = os.path.join(ARTIFACT_DIR, "modal_filters_after_badge.png")
        await page.screenshot(path=shot3)
        print("Screenshot 3 saved:", shot3)

        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
