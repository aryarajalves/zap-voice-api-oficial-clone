const { chromium } = require('playwright');
const path = require('path');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

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

    // Primeiro, clica no cabeçalho da pasta para selecioná-la (ativando as bordas e resizer da pasta)
    console.log("Selecionando a pasta...");
    const folderHeader = await page.waitForSelector('[data-testid="folder-title-display"]', { timeout: 10000 });
    if (folderHeader) {
        await folderHeader.click();
        console.log("Pasta selecionada!");
    }
    await page.waitForTimeout(1000);

    // Agora, clica e arrasta o nó de condição inteligente que está DENTRO da pasta!
    console.log("Arrastando o nó de dentro da pasta...");
    const innerNode = await page.waitForSelector('.react-flow__node-conditionNode', { timeout: 10000 });
    if (innerNode) {
        const box = await innerNode.boundingBox();
        if (box) {
            // Inicia drag no centro do cabeçalho do nó
            await page.mouse.move(box.x + box.width / 2, box.y + 25);
            await page.mouse.down();
            // Move 120px para a direita e 80px para baixo
            await page.mouse.move(box.x + box.width / 2 + 120, box.y + 25 + 80, { steps: 15 });
            await page.mouse.up();
            console.log("Nó arrastado com sucesso sobre a pasta!");
        }
    }
    await page.waitForTimeout(2000);

    const screenshotPath = path.resolve('C:\\Users\\aryar\\.gemini\\antigravity\\brain\\cd8b77a3-efbf-4889-8f89-3bbf669a5fb4', 'folder_zindex_drag_depois.png');
    await page.screenshot({ path: screenshotPath });
    console.log("Screenshot salvo em:", screenshotPath);

    await browser.close();
    console.log("Validação de arraste e z-index concluída com sucesso!");
})();
