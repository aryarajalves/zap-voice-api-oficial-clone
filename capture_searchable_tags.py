import os
import time
from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        print("Iniciando o navegador Chromium...")
        browser = p.chromium.launch(headless=True)
        # Usamos uma largura maior para garantir que a barra lateral direita fique visível e não colapsada
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()
        
        # 1. Login
        print("Acessando a página de login em http://localhost:5176...")
        page.goto("http://localhost:5176")
        
        print("Preenchendo credenciais de login...")
        page.fill("input[type='email']", "aryarajmarketing@gmail.com")
        page.fill("input[type='password']", "123456")
        
        print("Clicando no botão de login...")
        page.click("button[type='submit']")
        
        # 2. Aguardar 3 segundos. Clicar no botão 'Atendimento' no painel esquerdo para abrir o painel.
        print("Aguardando 3 segundos...")
        page.wait_for_timeout(3000)
        
        print("Clicando no botão 'Atendimento'...")
        page.click("button:has-text('Atendimento')")
        
        # 2.1. Clicar na primeira conversa disponível para abrir a barra lateral e os detalhes na direita
        print("Aguardando carregar a lista de conversas...")
        page.wait_for_timeout(3000)
        
        print("Clicando no primeiro item da lista de conversas...")
        page.locator("div.cursor-pointer").first.click()
        
        # 3. Aguardar 4 segundos. Clique no input de busca/criar etiquetas (placeholder "Pesquisar ou criar marcador...") na barra lateral direita.
        print("Aguardando 4 segundos...")
        page.wait_for_timeout(4000)
        
        placeholder = "Pesquisar ou criar marcador..."
        print(f"Clicando no input com placeholder '{placeholder}'...")
        # Localiza o input pelo placeholder
        tag_input = page.locator(f"input[placeholder='{placeholder}']")
        
        if tag_input.count() == 0:
            print("Input não encontrado pelo placeholder. Tentando encontrar por outros meios...")
            # Vamos listar os inputs para depuração se não for encontrado
            inputs = page.locator("input").all()
            for idx, inp in enumerate(inputs):
                placeholder_attr = inp.get_attribute("placeholder")
                print(f"Input {idx}: placeholder='{placeholder_attr}'")
        
        tag_input.click()
        
        # 4. Digite a palavra 'hum' no input para que o dropdown mostre as sugestões filtradas contendo apenas a etiqueta 'humano'.
        print("Digitando 'hum' no input...")
        tag_input.fill("hum")
        
        # 5. Aguarde 1 segundo.
        print("Aguardando 1 segundo...")
        page.wait_for_timeout(1000)
        
        # 6. Salve uma screenshot da barra lateral direita do Atendimento para comprovar o funcionamento perfeito da filtragem de marcadores.
        # Salve em C:\Users\aryar\.gemini\antigravity\brain\e2932a69-fc4b-4f16-8ccc-e5edbd95d2a4\searchable_tags_dropdown_verified.png
        screenshot_path = r"C:\Users\aryar\.gemini\antigravity\brain\e2932a69-fc4b-4f16-8ccc-e5edbd95d2a4\searchable_tags_dropdown_verified.png"
        print(f"Salvando screenshot em: {screenshot_path}")
        os.makedirs(os.path.dirname(screenshot_path), exist_ok=True)
        
        # Vamos tentar tirar print de toda a tela/viewport para que possamos ver o contexto completo e a barra lateral direita
        page.screenshot(path=screenshot_path)
        print("Screenshot salva com sucesso!")
        
        browser.close()

if __name__ == "__main__":
    run()
