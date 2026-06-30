import os
import time
from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        print("Iniciando o navegador Chromium...")
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 800})
        page = context.new_page()
        
        # 1. Login
        print("Acessando a página de login em http://localhost:5176...")
        page.goto("http://localhost:5176")
        
        print("Preenchendo credenciais de login...")
        page.fill("input[type='email']", "aryarajmarketing@gmail.com")
        page.fill("input[type='password']", "123456")
        
        print("Clicando no botão de login...")
        page.click("button[type='submit']")
        
        # 2. Aguardar 3 segundos. Clicar no botão 'Atendimento' na barra lateral esquerda.
        print("Aguardando 3 segundos...")
        page.wait_for_timeout(3000)
        
        print("Clicando no botão 'Atendimento'...")
        page.click("button:has-text('Atendimento')")
        
        # 3. Tirar uma screenshot da tela inteira (painel de chat cobrindo a tela toda com o botão 'Sair do Atendimento')
        print("Aguardando a tela de atendimento carregar...")
        page.wait_for_timeout(2000)
        
        screenshot_path_1 = r"C:\Users\aryar\.gemini\antigravity\brain\e2932a69-fc4b-4f16-8ccc-e5edbd95d2a4\chat_fullscreen_popup.png"
        print(f"Salvando screenshot do atendimento em: {screenshot_path_1}")
        os.makedirs(os.path.dirname(screenshot_path_1), exist_ok=True)
        page.screenshot(path=screenshot_path_1, full_page=True)
        
        # 4. Clicar no botão 'Sair do Atendimento' para fechar.
        print("Clicando em 'Sair do Atendimento'...")
        page.click("button:has-text('Sair do Atendimento')")
        page.wait_for_timeout(1000)
        
        # 5. Clicar no botão 'Configurações' no canto inferior esquerdo para abrir o modal de configurações.
        print("Clicando no botão 'Configurações'...")
        page.click("button:has-text('Configurações')")
        page.wait_for_timeout(1000)
        
        # 6. Clicar na aba 'Marcadores' (Marcadores / Etiquetas).
        print("Clicando na aba 'Marcadores'...")
        page.click("button:has-text('Marcadores')")
        page.wait_for_timeout(1000)
        
        # 7. No formulário de etiquetas, preencher o input do Nome com 'Suporte Tecnico', clicar na cor roxa (pode ser o 5º círculo ou preencher o seletor) e clicar em 'Criar Marcador'.
        print("Preenchendo o nome do marcador como 'Suporte Tecnico'...")
        page.fill("input[placeholder='Ex: Suporte, Financeiro, Lead Quente...']", "Suporte Tecnico")
        
        print("Selecionando a cor roxa (5º preset)...")
        # O 5º preset tem title="Roxo"
        page.click("button[title='Roxo']")
        
        print("Clicando no botão 'Criar Marcador'...")
        page.click("button:has-text('Criar Marcador')")
        
        # 8. Aguardar 2 segundos para o marcador aparecer na lista.
        print("Aguardando 2 segundos...")
        page.wait_for_timeout(2000)
        
        # 9. Tirar uma screenshot focando no modal de configurações na aba de Marcadores exibindo o marcador criado.
        screenshot_path_2 = r"C:\Users\aryar\.gemini\antigravity\brain\e2932a69-fc4b-4f16-8ccc-e5edbd95d2a4\custom_labels_management_tab.png"
        print(f"Salvando screenshot do modal de configurações em: {screenshot_path_2}")
        modal = page.locator("div.max-w-4xl")
        if modal.count() > 0:
            modal.first.screenshot(path=screenshot_path_2)
        else:
            page.screenshot(path=screenshot_path_2)
            
        print("Processo concluído com sucesso!")
        browser.close()

if __name__ == "__main__":
    run()
