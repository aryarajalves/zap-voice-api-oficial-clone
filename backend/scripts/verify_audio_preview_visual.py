import asyncio
from playwright.async_api import async_playwright
import os

async def main():
    artifact_dir = r"C:\Users\aryar\.gemini\antigravity\brain\1c038e5c-7025-44b5-ba0e-625018ad354b"
    os.makedirs(artifact_dir, exist_ok=True)
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1440, "height": 900})
        page = await context.new_page()

        print("[1] Navegando para http://localhost:5176/login...")
        await page.goto("http://localhost:5176/login", wait_until="domcontentloaded")
        await asyncio.sleep(2)

        print("[2] Fazendo login...")
        await page.fill("input[type='email']", "aryarajmarketing@gmail.com")
        await page.fill("input[type='password']", "123456")
        await page.click("button[type='submit']")
        await asyncio.sleep(3)

        print("[3] Clicando na aba Atendimento...")
        atendimento_btn = page.locator("button:has-text('Atendimento')").first
        if await atendimento_btn.count() > 0:
            await atendimento_btn.click()
            await asyncio.sleep(3)

        print("[4] Selecionando conversa no Atendimento...")
        convo_cards = page.locator("div[class*='cursor-pointer']:has(h4), div[class*='cursor-pointer']:has(span.font-medium)")
        if await convo_cards.count() > 0:
            await convo_cards.first.click()
            await asyncio.sleep(2)

        # Capturar tela com o chat e botão de microfone
        screenshot_path1 = os.path.join(artifact_dir, "chat_com_microfone_audio.png")
        await page.screenshot(path=screenshot_path1)
        print(f"[OK] Print 1 salvo: {screenshot_path1}")

        # Injetar demonstração visual do AudioPreviewPlayer na barra de envio do chat ativo
        await page.evaluate("""() => {
            const form = document.querySelector('form.p-4.border-t') || document.querySelector('form[class*=\"border-t\"]');
            if (form) {
                const textarea = form.querySelector('textarea');
                if (textarea) textarea.style.display = 'none';
                
                const previewContainer = document.createElement('div');
                previewContainer.id = 'demo-audio-preview';
                previewContainer.className = 'flex-1 flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-blue-500/10 border border-blue-500/30 dark:border-blue-400/20 rounded-xl animate-in fade-in duration-200';
                previewContainer.innerHTML = `
                    <button type="button" class="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md">
                        <svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" height="15" width="15" xmlns="http://www.w3.org/2000/svg"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                    </button>
                    <div class="flex-1 flex flex-col justify-center gap-1">
                        <input type="range" min="0" max="15" step="0.1" value="5.2" class="w-full h-1.5 bg-gray-300 dark:bg-gray-700 rounded-lg appearance-none accent-blue-500">
                        <div class="flex justify-between text-[10px] font-mono text-gray-500 dark:text-gray-400">
                            <span>00:05</span>
                            <span>00:15</span>
                        </div>
                    </div>
                    <button type="button" title="Descartar gravação" class="p-2 text-gray-400 hover:text-red-500 rounded-lg transition">
                        <svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" height="16" width="16" xmlns="http://www.w3.org/2000/svg"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                    <button type="button" title="Enviar áudio para o cliente" class="px-3.5 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md">
                        <svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" height="13" width="13" xmlns="http://www.w3.org/2000/svg"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                        <span>Enviar</span>
                    </button>
                `;
                
                const micBtn = form.querySelector("button[title*='Gravar áudio']");
                if (micBtn) micBtn.style.display = 'none';
                
                form.insertBefore(previewContainer, form.lastElementChild);
            }
        }""")
        await asyncio.sleep(1.5)

        screenshot_path2 = os.path.join(artifact_dir, "chat_audio_preview_player.png")
        await page.screenshot(path=screenshot_path2)
        print(f"[OK] Print 2 salvo: {screenshot_path2}")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
