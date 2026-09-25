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

    // Clica no cabeçalho da pasta para selecioná-la
    console.log("Selecionando a pasta...");
    const folderHeader = await page.waitForSelector('[data-testid="folder-title-display"]', { timeout: 10000 });
    if (folderHeader) {
        await folderHeader.click();
        console.log("Pasta selecionada!");
    }
    await page.waitForTimeout(1000);

    // Medir tamanho antes do redimensionamento
    const folderNode = await page.waitForSelector('[data-testid^="folder-node-"]', { timeout: 10000 });
    const initialBox = await folderNode.boundingBox();
    console.log(`Dimensões iniciais da pasta: Largura=${initialBox.width}px, Altura=${initialBox.height}px`);

    // Localizar a alça inferior direita do resizer
    console.log("Localizando a alça do redimensionador...");
    const resizeHandle = await page.waitForSelector('.react-flow__resize-control.handle.bottom.right', { timeout: 5000 });
    if (resizeHandle) {
        const handleBox = await resizeHandle.boundingBox();
        console.log(`Alça encontrada em x=${handleBox.x}, y=${handleBox.y}`);

        // Clicar e arrastar a alça para aumentar a pasta
        await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
        await page.mouse.down();
        // Arrastar +150px para a direita e +120px para baixo
        await page.mouse.move(handleBox.x + handleBox.width / 2 + 150, handleBox.y + handleBox.height / 2 + 120, { steps: 20 });
        await page.mouse.up();
        console.log("Redimensionamento executado!");
    } else {
        console.log("⚠️ Alça de redimensionamento não encontrada!");
    }
    await page.waitForTimeout(1500);

    // Medir novas dimensões
    const newBox = await folderNode.boundingBox();
    console.log(`Dimensões pós-redimensionamento: Largura=${newBox.width}px, Altura=${newBox.height}px`);

    if (newBox.width > initialBox.width && newBox.height > initialBox.height) {
        console.log("✅ SUCESSO: A pasta aumentou de tamanho perfeitamente!");
    }

    const screenshotPath = path.resolve('C:\\Users\\aryar\\.gemini\\antigravity\\brain\\cd8b77a3-efbf-4889-8f89-3bbf669a5fb4', 'folder_resized_depois.png');
    await page.screenshot({ path: screenshotPath });
    console.log("Screenshot salvo em:", screenshotPath);

    await browser.close();
})();
