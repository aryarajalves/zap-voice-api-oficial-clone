const { chromium } = require('playwright');
const path = require('path');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1366, height: 850 } });

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

    // Clicar no funil 173 na lista
    console.log("Abrindo funil 173 com o nó de condição...");
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

    // Capturar screenshot com o nó de Condição Inteligente exibindo as tags e operador
    const screenshotPath = path.resolve(__dirname, 'condition_node_depois.png');
    await page.screenshot({ path: screenshotPath });
    console.log("Screenshot do nó de condição salvo em:", screenshotPath);

    await browser.close();
    console.log("Sucesso na captura da evidência visual!");
})();
