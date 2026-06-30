import asyncio
import os
import sys
from playwright.async_api import async_playwright

# Forçar encoding UTF-8 no stdout do Windows
if sys.platform.startswith("win"):
    import sys
    sys.stdout.reconfigure(encoding="utf-8")

async def run():
    print("Iniciando Playwright...")
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        # Configurar contexto com viewport razoável
        context = await browser.new_context(viewport={"width": 1280, "height": 720})
        page = await context.new_page()

        console_logs = []
        network_logs = []

        # Registrar listeners
        page.on("console", lambda msg: console_logs.append(f"[CONSOLE][{msg.type}] {msg.text}"))
        page.on("requestfailed", lambda req: network_logs.append(f"[REQ_FAILED] {req.method} {req.url} - Error: {req.failure}"))
        
        async def handle_response(res):
            status = res.status
            if status >= 400 or "upload" in res.url or "media" in res.url:
                try:
                    text = await res.text()
                except Exception:
                    text = "<unreadable body>"
                headers = dict(res.headers)
                network_logs.append(
                    f"[RESP][{res.status}] {res.request.method} {res.url}\nHeaders: {headers}\nBody: {text[:500]}"
                )

        page.on("response", lambda res: asyncio.create_task(handle_response(res)))

        print("Acessando a página de login...")
        await page.goto("http://localhost:5176")
        await page.wait_for_load_state("networkidle")

        # Fazer login
        print("Realizando login...")
        await page.fill("input[type='email']", "aryarajmarketing@gmail.com")
        await page.fill("input[type='password']", "123456")
        await page.click("button[type='submit']")
        
        # Esperar carregar dashboard ou redirecionamento
        await page.wait_for_timeout(4000)
        
        # Navegar para 'Meus Funis'
        print("Navegando para 'Meus Funis'...")
        # Localiza link ou item de menu com 'Meus Funis' ou 'Funis'
        funnel_menu = page.locator("text=Meus Funis")
        if await funnel_menu.count() > 0:
            await funnel_menu.first.click()
        else:
            await page.goto("http://localhost:5176/funnels")
        
        await page.wait_for_timeout(3000)

        # Clicar no primeiro funil - botão EDITAR
        print("Procurando o botão EDITAR...")
        editar_btn = page.locator("text=EDITAR").first
        if await editar_btn.count() > 0:
            print("Clicando no botão EDITAR...")
            await editar_btn.click()
        else:
            print("Botão EDITAR não encontrado diretamente, tentando alternativas...")
            # Alternativa: tentar clicar no primeiro funil
            await page.goto("http://localhost:5176/funnels/1")
        
        # Aguardar carregamento da página do funil (canvas)
        await page.wait_for_timeout(5000)

        # Verificar se existe input[type='file'] no Canvas
        print("Verificando se existe input[type='file'] no canvas...")
        file_input = page.locator("input[type='file']")
        
        if await file_input.count() == 0:
            print("Input de arquivo não encontrado. Tentando clicar com o botão direito para criar um nó de Mídia...")
            # Clicar com botão direito no meio do canvas
            canvas = page.locator(".react-flow__pane, .react-flow__renderer, div.react-flow, main")
            if await canvas.count() > 0:
                # Clicar com botão direito no centro do container react-flow
                box = await canvas.first.bounding_box()
                if box:
                    x = box["x"] + box["width"] / 2
                    y = box["y"] + box["height"] / 2
                    await page.mouse.click(x, y, button="right")
                    await page.wait_for_timeout(1000)
                    
                    # Clicar na opção de Mídia / Audio / Nó de Mídia
                    # Vamos tirar um print temporário ou tentar localizar as opções
                    options = ["Mídia", "Media", "Áudio", "Audio", "Adicionar Nó"]
                    clicked = False
                    for opt in options:
                        opt_loc = page.locator(f"text={opt}").first
                        if await opt_loc.count() > 0:
                            print(f"Clicando na opção: {opt}")
                            await opt_loc.click()
                            clicked = True
                            break
                    if not clicked:
                        print("Não conseguimos clicar em nenhuma opção de menu conhecida. Tentando pressionar Enter ou clique genérico.")
                    await page.wait_for_timeout(2000)
                else:
                    print("Não foi possível obter a caixa delimitadora do canvas.")
            else:
                print("Canvas React-Flow não encontrado.")

        # Re-verificar/tentar achar o input[type='file']
        file_input = page.locator("input[type='file']")
        if await file_input.count() > 0:
            print("Input de arquivo encontrado. Selecionando dummy.png...")
            file_path = r"c:\Users\aryar\.gemini\antigravity\scratch\Projetos Serios\Projeto - ZapVoice no Chatwoot\dummy.png"
            if not os.path.exists(file_path):
                print(f"ERRO: arquivo não existe localmente em {file_path}")
            else:
                # Usar set_input_files no input encontrado
                await file_input.first.set_input_files(file_path)
                print("Arquivo selecionado. Aguardando 10 segundos para capturar logs de upload...")
                await page.wait_for_timeout(10000)
        else:
            print("Não foi possível encontrar ou instanciar um input[type='file'] para upload.")
            await page.wait_for_timeout(3000)

        # Salvar screenshot de erro
        screenshot_dir = r"C:\Users\aryar\.gemini\antigravity\brain\e2932a69-fc4b-4f16-8ccc-e5edbd95d2a4"
        os.makedirs(screenshot_dir, exist_ok=True)
        screenshot_path = os.path.join(screenshot_dir, "media_upload_success_proxy_verified.png")
        await page.screenshot(path=screenshot_path, full_page=True)
        print(f"Screenshot salva em: {screenshot_path}")

        # Fechar browser
        await browser.close()

        # Reportar logs coletados
        print("\n=== LOGS DE CONSOLE COLETADOS ===")
        for log in console_logs:
            try:
                print(log)
            except Exception as e:
                print(f"[LOG_PRINT_ERROR] {e} - Content: {repr(log)}")

        print("\n=== LOGS DE REDE COLETADOS ===")
        for log in network_logs:
            try:
                print(log)
            except Exception as e:
                print(f"[LOG_PRINT_ERROR] {e} - Content: {repr(log)}")

if __name__ == "__main__":
    asyncio.run(run())
