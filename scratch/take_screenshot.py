import os
import time
from playwright.sync_api import sync_playwright

def run():
    print("Iniciando Playwright...")
    with sync_playwright() as p:
        # Launch chromium
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 720})
        page = context.new_page()
        
        # Navigate to http://localhost:5176
        print("Navegando para http://localhost:5176...")
        page.goto("http://localhost:5176")
        page.wait_for_timeout(2000)
        
        # Log in
        print("Inserindo e-mail...")
        page.fill("input[type='email']", "aryarajmarketing@gmail.com")
        print("Inserindo senha...")
        page.fill("input[type='password']", "123456")
        
        # Click login button
        print("Clicando no botão de login...")
        login_button = page.locator("button:has-text('Entrar')")
        if login_button.count() == 0:
            login_button = page.locator("button[type='submit']")
        
        login_button.click()
        page.wait_for_timeout(4000)
        
        print("Verificando se logou...")
        print("URL atual:", page.url)
        
        # Open Settings Modal
        print("Abrindo Configurações...")
        settings_btn = page.locator("button:has-text('Configurações')")
        if settings_btn.count() > 0:
            settings_btn.click()
            page.wait_for_timeout(2000)
            
            # Click WhatsApp Tab
            print("Clicando na aba WhatsApp...")
            whatsapp_tab = page.locator("button:has-text('WhatsApp')")
            if whatsapp_tab.count() > 0:
                whatsapp_tab.first.click()
                page.wait_for_timeout(2000)
                
                # Check if Lembretes de Agendamento section is visible and toggle checkbox if not checked
                checkbox = page.locator("input[name='APPOINTMENTS_ENABLED']")
                if checkbox.count() > 0:
                    is_checked = checkbox.is_checked()
                    print(f"Checkbox APPOINTMENTS_ENABLED está marcado? {is_checked}")
                    if not is_checked:
                        print("Marcando o checkbox...")
                        # Click the label or wrapper or the checkbox itself ( SR-only check can be tricky, so click its label / parent wrapper )
                        # Let's locate the toggle container
                        toggle_switch = page.locator("input[name='APPOINTMENTS_ENABLED'] + div")
                        if toggle_switch.count() > 0:
                            toggle_switch.first.click()
                        else:
                            checkbox.check(force=True)
                        page.wait_for_timeout(1000)
                    
                    # Also select a template if none is selected, just to prevent any validation issues
                    template_select = page.locator("select[name='APPOINTMENTS_REMINDER_TEMPLATE']")
                    if template_select.count() > 0 and template_select.is_visible():
                        # Select first non-empty option
                        template_select.select_option(index=1)
                        page.wait_for_timeout(500)
                
                # Take a screenshot of settings page/tab to verify the "Lembretes de Agendamento" section
                print("Salvando screenshot da aba WhatsApp...")
                os.makedirs("scratch", exist_ok=True)
                page.screenshot(path="scratch/whatsapp_settings.png")
                
                # Click Save (submit button)
                print("Clicando em Salvar configurações...")
                save_btn = page.locator("button[type='submit']:has-text('Salvar')")
                if save_btn.count() == 0:
                    save_btn = page.locator("button[type='submit']")
                
                if save_btn.count() > 0:
                    save_btn.click()
                    page.wait_for_timeout(3000)
        
        # Navigate to Agendamentos
        print("Clicando no menu item Agendamentos no Sidebar...")
        agendamentos_link = page.locator("button:has-text('Agendamentos')")
        if agendamentos_link.count() == 0:
            agendamentos_link = page.locator("a:has-text('Agendamentos')")
        if agendamentos_link.count() == 0:
            agendamentos_link = page.locator("text='Agendamentos'")
            
        if agendamentos_link.count() > 0:
            agendamentos_link.first.click()
            page.wait_for_timeout(3000)
        else:
            print("Link não encontrado no menu lateral. Tentando recarregar a página...")
            page.reload()
            page.wait_for_timeout(3000)
            agendamentos_link = page.locator("button:has-text('Agendamentos')")
            if agendamentos_link.count() > 0:
                agendamentos_link.first.click()
                page.wait_for_timeout(3000)
            else:
                print("Ainda não encontrado no menu lateral. Tentando clicar no elemento pelo ID ou texto.")
                
        print("URL atual:", page.url)
        
        # Take a screenshot of the appointments page.
        screenshots_dir = "screenshots"
        os.makedirs(screenshots_dir, exist_ok=True)
        screenshot_path = os.path.join(screenshots_dir, "agendamentos_col_fixed.png")
        
        # Also copy it to C:\Users\aryar\.gemini\antigravity\browser_recordings if possible
        recordings_dir = r"C:\Users\aryar\.gemini\antigravity\browser_recordings"
        os.makedirs(recordings_dir, exist_ok=True)
        recording_path = os.path.join(recordings_dir, "agendamentos_col_fixed.png")
        
        page.screenshot(path=screenshot_path, full_page=True)
        page.screenshot(path=recording_path, full_page=True)
        
        print(f"Screenshots salvos com sucesso em:\n- {screenshot_path}\n- {recording_path}")
        
        browser.close()

if __name__ == "__main__":
    run()
