const { chromium } = require('playwright');
const path = require('path');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

    // Capturar erros do console para termos 100% de certeza
    page.on('console', msg => {
        if (msg.type() === 'error') {
            console.log('BROWSER ERROR:', msg.text());
        }
    });
    page.on('pageerror', err => {
        console.log('PAGE ERROR:', err.message);
    });

    console.log("Navegando para o login...");
    await page.goto('http://localhost:5176', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    const emailInput = await page.$('input[type="email"]');
    if (emailInput) {
        console.log("Preenchendo credenciais...");
        await page.fill('input[type="email"]', 'aryarajmarketing@gmail.com');
        await page.fill('input[type="password"]', '123456');
        await page.click('button[type="submit"]');
        await page.waitForTimeout(3000);
    }

    console.log("Clicando no menu Meus Funis...");
    const funnelsMenuBtn = await page.waitForSelector('button:has-text("Meus Funis"), span:has-text("Meus Funis")', { timeout: 10000 });
    if (funnelsMenuBtn) {
        await funnelsMenuBtn.click();
    }
    await page.waitForTimeout(2500);

    console.log("Abrindo funil 173...");
    const funnelRow = await page.waitForSelector('tr:has-text("15:30"), div:has-text("15:30"), tr:first-child', { timeout: 10000 });
    if (funnelRow) {
        const editBtn = await funnelRow.$('button[title="Editar Fluxo"], button:has-text("Editar")');
        if (editBtn) {
            await editBtn.click();
        } else {
            await funnelRow.click();
        }
    }
    await page.waitForTimeout(3500);

    // Clicar com o botão direito no canvas do ReactFlow em área livre
    console.log("Executando clique com botão direito no canvas...");
    const flowPane = await page.waitForSelector('.react-flow__pane', { timeout: 10000 });
    if (flowPane) {
        await page.evaluate(() => {
            const pane = document.querySelector('.react-flow__pane');
            if (pane) {
                const rect = pane.getBoundingClientRect();
                const event = new MouseEvent('contextmenu', {
                    bubbles: true,
                    cancelable: true,
                    view: window,
                    clientX: rect.left + 450,
                    clientY: rect.top + 250,
                    button: 2
                });
                pane.dispatchEvent(event);
            }
        });
        console.log("Evento contextmenu disparado no .react-flow__pane!");
    }
    await page.waitForTimeout(2000);

    // Verificar se o menu de contexto apareceu
    const menu = await page.waitForSelector('text="Adicionar Nó"', { timeout: 5000 }).catch(() => null);
    if (menu) {
        console.log("✅ Menu de Contexto 'Adicionar Nó' renderizado com sucesso!");
    } else {
        console.log("⚠️ Menu não encontrado por texto direto, capturando screenshot do estado atual.");
    }

    const screenshotPath = path.resolve('C:\\Users\\aryar\\.gemini\\antigravity\\brain\\cd8b77a3-efbf-4889-8f89-3bbf669a5fb4', 'context_menu_botao_direito.png');
    await page.screenshot({ path: screenshotPath });
    console.log("Screenshot salvo em:", screenshotPath);

    await browser.close();
})();
