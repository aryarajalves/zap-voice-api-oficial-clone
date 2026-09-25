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

    console.log("Navegando para Meus Funis...");
    const funnelsMenuBtn = await page.waitForSelector('button:has-text("Meus Funis"), span:has-text("Meus Funis")', { timeout: 10000 });
    if (funnelsMenuBtn) {
        await funnelsMenuBtn.click();
    }
    await page.waitForTimeout(2500);

    // Verificar se o botão Importar Funil está presente no topo
    const importBtn = await page.waitForSelector('[data-testid="funnel-import-btn"], button:has-text("Importar Funil")', { timeout: 5000 });
    if (importBtn) {
        console.log("✅ Botão 'Importar Funil' encontrado no cabeçalho da listagem!");
    }

    // Verificar se o botão Exportar está presente na linha dos funis
    const exportBtn = await page.waitForSelector('button:has-text("Exportar")', { timeout: 5000 });
    if (exportBtn) {
        console.log("✅ Botão 'Exportar' encontrado na lista de ações de cada funil!");
    }

    // Fazer hover no primeiro funil para evidenciar a barra de botões com o botão Exportar visível
    const firstFunnelRow = await page.waitForSelector('div.group:has(button:has-text("Exportar"))', { timeout: 5000 });
    if (firstFunnelRow) {
        await firstFunnelRow.hover();
        await page.waitForTimeout(1000);
    }

    // Capturar screenshot da lista de funis com os novos botões de Importar e Exportar visíveis
    const screenshotPath = path.resolve('C:\\Users\\aryar\\.gemini\\antigravity\\brain\\cd8b77a3-efbf-4889-8f89-3bbf669a5fb4', 'export_import_funnel_depois.png');
    await page.screenshot({ path: screenshotPath });
    console.log("Screenshot salvo em:", screenshotPath);

    await browser.close();
    console.log("Validação visual de Exportar e Importar concluída com sucesso!");
})();
