import os
import time
from playwright.sync_api import sync_playwright
from PIL import Image

def run():
    with sync_playwright() as p:
        print("Iniciando o navegador...")
        browser = p.chromium.launch(headless=True)
        # Use viewport size to capture everything clearly
        context = browser.new_context(viewport={"width": 1280, "height": 950})
        page = context.new_page()

        print("Acessando a página de login...")
        page.goto("http://localhost:5176")
        page.wait_for_load_state("networkidle")

        print("Realizando login...")
        page.fill("input[type='email']", "aryarajmarketing@gmail.com")
        page.fill("input[type='password']", "123456")
        page.click("button[type='submit']")

        print("Aguardando login...")
        page.wait_for_timeout(5000)

        # Selecionar cliente se não houver cliente ativo
        has_no_client = page.locator('button:has-text("Sem cliente selecionado")').count()
        if has_no_client > 0:
            print("Nenhum cliente ativo. Selecionando o primeiro disponível...")
            page.locator('button:has-text("Sem cliente selecionado")').click(force=True)
            page.wait_for_timeout(1000)
            page.locator('div.max-h-60 button').first.click(force=True)
            page.wait_for_timeout(3000)

        print("Navegando para Integrações Webhook...")
        page.locator('aside button:has-text("Integrações Webhook")').first.click(force=True)
        page.wait_for_timeout(4000)

        # 1. Capturar os Gatilhos com mapeamento de botão
        print("Clicando no botão de editar da primeira integração...")
        page.locator('button[title="Editar"]').first.click(force=True)
        page.wait_for_timeout(3000)

        print("Clicando na aba Gatilhos...")
        # A aba Gatilhos
        page.locator('button:has-text("Gatilhos")').first.click(force=True)
        page.wait_for_timeout(2000)

        # Garantir que o Gatilho #1 está expandido
        trigger_header = page.locator('span:has-text("Gatilho #1")')
        if trigger_header.count() > 0:
            print("Gatilho #1 encontrado. Garantindo que está expandido...")
            # Se não estiver visível os detalhes do template, a gente clica para expandir
            is_visible_tpl = page.locator('text=Template').first.is_visible()
            if not is_visible_tpl:
                trigger_header.click(force=True)
                page.wait_for_timeout(2000)

        # Vamos selecionar um template que tem botões para podermos ver as ações dos botões.
        # Vamos tentar ver os templates disponíveis.
        print("Selecionando o template com botões se necessário...")
        # Clicar no seletor de template
        template_select = page.locator('div:has-text("Template") + div select, div:has-text("Template") select, select:has-text("Selecione um Template")').first
        if template_select.count() > 0:
            # Seleciona o primeiro ou um específico
            pass
        else:
            # Talvez seja um custom select component. Vamos procurar um botão/div com o placeholder
            custom_select = page.locator('div:has-text("Selecione um Template...")').first
            if custom_select.count() > 0:
                print("Seletor customizado de template encontrado. Abrindo...")
                custom_select.click(force=True)
                page.wait_for_timeout(1500)
                # Selecionar uma opção que tenha botões. Vamos ver as opções.
                options = page.locator('div.absolute select, div.absolute button, div[role="option"]').all()
                print(f"Encontradas {len(options)} opções de template.")
                # Vamos clicar em uma opção
                if len(options) > 0:
                    options[0].click(force=True)
                    page.wait_for_timeout(2000)

        print("Tirando print da tela de Gatilhos...")
        os.makedirs("scripts/screenshots", exist_ok=True)
        img1_path = "scripts/screenshots/gatilhos.png"
        page.screenshot(path=img1_path)

        # Fechar o modal de edição
        print("Fechando modal de edição...")
        # Procurar o botão com ícone de fechar ou texto Fechar/Cancelar ou clicar no backdrop
        # Geralmente há um botão de fechar (x) ou "Cancelar" ou "Fechar"
        close_btn = page.locator('button:has-text("Cancelar"), button:has-text("Fechar"), button:has(svg)').first
        close_btn.click(force=True)
        page.wait_for_timeout(2000)

        # 2. Capturar o Histórico de Disparos
        print("Abrindo Histórico de Disparos...")
        disparos_btn = page.locator('main button:has-text("Disparos")').first
        disparos_btn.click(force=True)
        page.wait_for_timeout(4000)

        print("Tirando print do histórico de disparos...")
        img2_path = "scripts/screenshots/disparos.png"
        page.screenshot(path=img2_path)

        # Combinar imagens
        print("Mesclando imagens...")
        img1 = Image.open(img1_path)
        img2 = Image.open(img2_path)

        # Redimensionar ou concatenar verticalmente
        total_width = max(img1.width, img2.width)
        total_height = img1.height + img2.height

        new_img = Image.new('RGB', (total_width, total_height))
        new_img.paste(img1, (0, 0))
        new_img.paste(img2, (0, img1.height))

        target_path = r"C:\Users\aryar\.gemini\antigravity\brain\394cf6ae-2130-463c-abb8-1ce103d15b12\visual_validation.png"
        os.makedirs(os.path.dirname(target_path), exist_ok=True)
        new_img.save(target_path)
        print(f"Imagem final salva com sucesso em: {target_path}")

        browser.close()

if __name__ == "__main__":
    run()
