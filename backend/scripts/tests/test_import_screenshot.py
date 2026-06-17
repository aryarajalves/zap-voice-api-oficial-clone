import asyncio
import os
import sys
from playwright.async_api import async_playwright

async def run():
    scratch_dir = r"C:\Users\aryar\.gemini\antigravity\brain\54467b7e-60bc-45bb-803a-cb1b142a02e1\scratch"
    os.makedirs(scratch_dir, exist_ok=True)
    
    csv_content = "nome,telefone,tags\nArya Alves,5585999999991,teste\nJose Souza,5585999999992,teste\nMaria Silva,5585999999993,teste"
    csv_path = os.path.abspath("temp_contacts.csv")
    with open(csv_path, "w", encoding="utf-8") as f:
        f.write(csv_content)
    
    print(f"Created temp CSV at: {csv_path}")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 800})
        page = await context.new_page()

        print("Navigating to http://localhost:5176...")
        await page.goto("http://localhost:5176")
        await page.wait_for_load_state("networkidle")

        print("Logging in...")
        await page.fill("input[type='email']", "aryarajmarketing@gmail.com")
        await page.fill("input[type='password']", "123456")
        await page.click("button[type='submit']")
        
        await page.wait_for_load_state("networkidle")
        await asyncio.sleep(4)
        
        await page.screenshot(path=os.path.join(scratch_dir, "step1_logged_in.png"))
        print("Logged in. Saved step1_logged_in.png")

        # Let's check if the sidebar elements are loaded
        # If "Contatos" is not visible, maybe we need to select a client
        client_selector_btn = page.locator("button:has-text('Sem cliente selecionado')")
        if await client_selector_btn.count() > 0:
            print("No client selected. Clicking client selector...")
            await client_selector_btn.click()
            await asyncio.sleep(1)
            await page.screenshot(path=os.path.join(scratch_dir, "step1b_client_dropdown.png"))
            
            dropdown_buttons = page.locator("div.absolute.left-4.right-4 button")
            if await dropdown_buttons.count() > 0:
                print(f"Selecting first client: {await dropdown_buttons.first().inner_text()}")
                await dropdown_buttons.first().click()
                await asyncio.sleep(2)
                await page.screenshot(path=os.path.join(scratch_dir, "step1c_client_selected.png"))
            else:
                print("No client options in dropdown!")

        # Wait and click on the "Contatos" button using text-is
        print("Clicking 'Contatos' button...")
        contatos_btn = page.locator("aside button:text-is('Contatos')")
        if await contatos_btn.count() > 0:
            await contatos_btn.click()
            await page.wait_for_load_state("networkidle")
            await asyncio.sleep(3)
            await page.screenshot(path=os.path.join(scratch_dir, "step2_contacts_page.png"))
            print("Successfully navigated to Contatos page.")
        else:
            print("ERROR: Contatos button not found in sidebar!")
            await page.screenshot(path=os.path.join(scratch_dir, "error_no_contatos_btn.png"))
            sys.exit(1)

        # Now click the "Importar" button
        print("Clicking 'Importar' button...")
        importar_btn = page.locator("button:has-text('Importar')")
        if await importar_btn.count() > 0:
            await importar_btn.click()
            await asyncio.sleep(2)
            await page.screenshot(path=os.path.join(scratch_dir, "step3_import_modal_open.png"))
        else:
            print("ERROR: Importar button not found on page!")
            await page.screenshot(path=os.path.join(scratch_dir, "error_no_importar_btn.png"))
            sys.exit(1)

        # Select "Importar via Arquivo"
        print("Selecting 'Importar via Arquivo'...")
        via_arquivo = page.locator("div:has-text('Importar via Arquivo')").last
        await via_arquivo.click()
        await asyncio.sleep(2)
        await page.screenshot(path=os.path.join(scratch_dir, "step4_file_upload_step.png"))

        # Upload the CSV file
        print("Uploading CSV...")
        file_input = page.locator("input[type='file']")
        await file_input.set_input_files(csv_path)

        # Wait for Step 2 of the modal to appear
        print("Waiting for Step 2 of the modal...")
        await page.wait_for_selector("text=Passo 2 de 3", timeout=15000)
        await asyncio.sleep(3) # Give it time to finish counting/processing

        # Capture screenshot of the modal showing the badge
        screenshot_path = os.path.abspath("screenshot_depois_rows.png")
        print(f"Saving screenshot to: {screenshot_path}")
        await page.screenshot(path=screenshot_path)
        
        # Also copy it to scratch dir for reference
        await page.screenshot(path=os.path.join(scratch_dir, "screenshot_depois_rows.png"))

        await browser.close()
        
        # Clean up CSV
        if os.path.exists(csv_path):
            os.remove(csv_path)
            
        print("Finished successfully.")

if __name__ == "__main__":
    asyncio.run(run())
