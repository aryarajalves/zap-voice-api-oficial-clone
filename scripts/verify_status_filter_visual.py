# -*- coding: utf-8 -*-
import asyncio
from playwright.async_api import async_playwright
import os

ARTIFACT_DIR = r"C:\Users\aryar\.gemini\antigravity\brain\c98ffa8c-6962-47ab-81d0-b67155534b39"

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={'width': 1440, 'height': 900})
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
            await page.wait_for_load_state("networkidle")

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

        print("Clicking on 'Integrações' in Sidebar...")
        integracoes_nav = page.locator("button").filter(has_text="Integra").first
        await integracoes_nav.scroll_into_view_if_needed()
        await integracoes_nav.click()
        await page.wait_for_timeout(2500)

        print("Locating Disparos button in table...")
        disparos_btn = page.locator("table button").filter(has_text="Disparos").first
        await disparos_btn.wait_for(state="visible", timeout=10000)
        print("Clicking Disparos button...")
        await disparos_btn.click()
        await page.wait_for_timeout(2500)

        # Wait for modal
        modal_header = page.locator("h3").filter(has_text="Disparos")
        await modal_header.wait_for(state="visible", timeout=10000)
        print("Modal opened successfully!")

        # 1. Open Status dropdown
        print("Locating Status dropdown in modal...")
        status_label = page.locator("label").filter(has_text="Status").first
        status_container = status_label.locator("..").locator(".cursor-pointer").first
        await status_container.wait_for(state="visible", timeout=5000)
        await status_container.click()
        await page.wait_for_timeout(800)

        # Screenshot 1: Status dropdown open showing "Todos os Status"
        shot1 = os.path.join(ARTIFACT_DIR, "modal_status_dropdown_open.png")
        await page.screenshot(path=shot1)
        print(f"Screenshot 1 saved: {shot1}")

        # 2. Click "Sucesso / Enviados"
        print("Selecting 'Sucesso / Enviados'...")
        sucesso_opt = page.locator("span, div").filter(has_text="Sucesso / Enviados").last
        await sucesso_opt.click()
        await page.wait_for_timeout(2000)

        shot2 = os.path.join(ARTIFACT_DIR, "modal_status_filter_sucesso.png")
        await page.screenshot(path=shot2)
        print(f"Screenshot 2 saved: {shot2}")

        # 3. Select "Erro / Falhas"
        print("Opening Status dropdown again...")
        await status_container.click()
        await page.wait_for_timeout(800)
        
        print("Selecting 'Erro / Falhas'...")
        falhas_opt = page.locator("span, div").filter(has_text="Erro / Falhas").last
        await falhas_opt.click()
        await page.wait_for_timeout(2000)

        shot3 = os.path.join(ARTIFACT_DIR, "modal_status_filter_falhas.png")
        await page.screenshot(path=shot3)
        print(f"Screenshot 3 saved: {shot3}")

        # 4. Click "Todos os Status"
        print("Opening Status dropdown again...")
        await status_container.click()
        await page.wait_for_timeout(800)

        print("Selecting 'Todos os Status'...")
        todos_opt = page.locator("span, div").filter(has_text="Todos os Status").last
        await todos_opt.click()
        await page.wait_for_timeout(2000)

        shot4 = os.path.join(ARTIFACT_DIR, "modal_status_filter_todos.png")
        await page.screenshot(path=shot4)
        print(f"Screenshot 4 saved: {shot4}")

        await browser.close()
        print("All visual proofs captured successfully!")

if __name__ == "__main__":
    asyncio.run(run())
