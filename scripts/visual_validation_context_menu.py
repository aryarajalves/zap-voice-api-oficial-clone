import os
import time
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\aryar\.gemini\antigravity\brain\3d9a2ef5-d8d8-4862-8e6c-82574da0fe64"

def run():
    os.makedirs(ARTIFACT_DIR, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        print("1. Acessando o sistema...")
        page.goto("http://localhost:5176", wait_until="networkidle")
        time.sleep(2)
        if page.locator('input[type="email"], input[name="email"]').is_visible():
            page.fill('input[type="email"], input[name="email"]', "aryarajmarketing@gmail.com")
            page.fill('input[type="password"], input[name="password"]', "123456")
            page.click('button[type="submit"]')
            time.sleep(4)

        print("2. Abrindo Atendimento...")
        page.locator('button, a').filter(has_text="Atendimento").first.click()
        time.sleep(3)

        print("3. Selecionando a conversa de Aryaraj...")
        page.locator('text="Aryaraj"').first.click()
        time.sleep(3)

        # Aguarda a mensagem carregar ou envia uma caso necessário
        msg_bubble = page.locator('div[id^="msg-"]').first
        if not msg_bubble.is_visible():
            chat_input = page.locator('textarea, input[placeholder*="Digite" i]').first
            if chat_input.is_visible():
                chat_input.fill("Olá, esta é uma mensagem de teste para o menu de contexto!")
                page.keyboard.press("Enter")
                time.sleep(2)

        msg_bubble = page.locator('div[id^="msg-"]').first
        msg_bubble.wait_for(state="visible", timeout=10000)

        print("4. Clicando com o botão direito na mensagem para abrir o Menu de Contexto...")
        msg_bubble.click(button="right")
        time.sleep(1)

        screenshot_menu_path = os.path.join(ARTIFACT_DIR, "context_menu_open.png")
        page.screenshot(path=screenshot_menu_path)
        print(f"Screenshot 1 salva: {screenshot_menu_path}")

        print("5. Clicando em 'Fixar' no menu de contexto...")
        page.locator('[data-testid="context-menu-pin"]').click()
        time.sleep(2)

        screenshot_pinned_path = os.path.join(ARTIFACT_DIR, "pinned_message_banner.png")
        page.screenshot(path=screenshot_pinned_path)
        print(f"Screenshot 2 salva: {screenshot_pinned_path}")

        print("6. Clicando com o botão direito para 'Favoritar' a mensagem...")
        msg_bubble.click(button="right")
        time.sleep(1)
        page.locator('[data-testid="context-menu-star"]').click()
        time.sleep(2)

        print("7. Abrindo modal de Mensagens Favoritas no painel lateral...")
        starred_btn = page.locator('[data-testid="starred-messages-button"]')
        if starred_btn.is_visible():
            starred_btn.click()
            time.sleep(2)

        screenshot_starred_modal_path = os.path.join(ARTIFACT_DIR, "starred_messages_modal.png")
        page.screenshot(path=screenshot_starred_modal_path)
        print(f"Screenshot 3 salva: {screenshot_starred_modal_path}")

        browser.close()
        print("Validação visual concluída com sucesso!")

if __name__ == "__main__":
    run()
