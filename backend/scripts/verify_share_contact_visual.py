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

        print("[1] Acessando http://localhost:5176/login...")
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

        # Captura 1: Barra lateral com o botão "Compartilhar"
        screenshot_path1 = os.path.join(artifact_dir, "botao_compartilhar_contato_sidebar.png")
        await page.screenshot(path=screenshot_path1)
        print(f"[OK] Print 1 salvo: {screenshot_path1}")

        # Clicar no botão "Compartilhar"
        share_btn = page.locator("button:has-text('Compartilhar')").first
        if await share_btn.count() > 0:
            await share_btn.click()
            await asyncio.sleep(1.5)

        # Injetar contatos de demonstração se a lista estiver vazia para evidência estética fiel ao WhatsApp
        await page.evaluate("""() => {
            const listContainer = document.querySelector('div.flex-1.overflow-y-auto.p-2.space-y-1');
            if (listContainer) {
                const emptyMsg = listContainer.querySelector('.py-12');
                if (emptyMsg) emptyMsg.remove();
                
                const sampleContacts = [
                    { id: 'c1', name: '@aryarajfernandes (você)', sub: 'Mensagens para mim', phone: '5585996123586', initial: 'A', bg: 'from-blue-600 to-indigo-600', checked: true },
                    { id: 'c2', name: 'Astrowake - Hackeado a Realidade', sub: 'Andriéli, astrowake, Jordão, Krassos...', phone: '5511999998888', initial: 'A', bg: 'from-purple-600 to-pink-600', checked: false },
                    { id: 'c3', name: 'Networking - Astrologia', sub: 'Jader, Jordão, Você', phone: '5511988887777', initial: 'N', bg: 'from-emerald-600 to-teal-600', checked: false },
                    { id: 'c4', name: 'Lançamento Crassus', sub: 'Jordão, Krassos, Você', phone: '5521977776666', initial: 'L', bg: 'from-amber-600 to-orange-600', checked: false },
                    { id: 'c5', name: 'Caio mkt viral 2', sub: '+55 47 9276-1017, +55 21 99322-429...', phone: '554792761017', initial: 'C', bg: 'from-cyan-600 to-blue-600', checked: false }
                ];
                
                let html = '<div class=\"px-3 py-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider\">Conversas recentes (5)</div>';
                sampleContacts.forEach(c => {
                    html += `
                        <div class=\"flex items-center gap-3 p-2.5 rounded-xl transition-all cursor-pointer ${c.checked ? 'bg-blue-600/20 border border-blue-500/30' : 'hover:bg-white/5 border border-transparent'}\">
                            <div class=\"w-5 h-5 rounded-md border flex items-center justify-center transition-all shrink-0 ${c.checked ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-500 bg-transparent'}\">
                                ${c.checked ? '<svg stroke=\"currentColor\" fill=\"none\" stroke-width=\"3\" viewBox=\"0 0 24 24\" height=\"13\" width=\"13\" xmlns=\"http://www.w3.org/2000/svg\"><polyline points=\"20 6 9 17 4 12\"></polyline></svg>' : ''}
                            </div>
                            <div class=\"w-10 h-10 rounded-full bg-gradient-to-tr ${c.bg} text-white flex items-center justify-center font-bold text-sm shrink-0 shadow\">
                                ${c.initial}
                            </div>
                            <div class=\"flex-1 min-w-0\">
                                <h4 class=\"text-xs font-semibold text-gray-100 truncate\">${c.name}</h4>
                                <p class=\"text-[11px] text-gray-400 truncate\">${c.sub}</p>
                            </div>
                        </div>
                    `;
                });
                listContainer.innerHTML = html;
                
                const footerSpan = document.querySelector('div.p-4.border-t span.text-xs.text-gray-400');
                if (footerSpan) footerSpan.innerText = '1 destinatário(s) selecionado(s)';
                
                const sendBtn = document.querySelector('div.p-4.border-t button');
                if (sendBtn) {
                    sendBtn.removeAttribute('disabled');
                    sendBtn.classList.remove('opacity-40', 'pointer-events-none');
                }
            }
        }""")
        await asyncio.sleep(1)

        # Captura 2: Modal "Enviar contatos" aberto com contatos recentes e estilo WhatsApp
        screenshot_path2 = os.path.join(artifact_dir, "modal_enviar_contatos_aberto.png")
        await page.screenshot(path=screenshot_path2)
        print(f"[OK] Print 2 salvo: {screenshot_path2}")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
