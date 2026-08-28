const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function run() {
    const artifactDir = path.resolve('C:/Users/aryar/.gemini/antigravity/brain/5ed54c5c-392a-4bc6-b566-c4c5e324bf7e');
    const screenshotsDir = path.join(__dirname, 'screenshots');
    if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir, { recursive: true });
    }

    console.log('Iniciando o navegador Chromium...');
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1280, height: 850 });

    try {
        console.log('Navegando para o frontend...');
        await page.goto('http://localhost:5176', { waitUntil: 'domcontentloaded', timeout: 30000 });

        // Login
        console.log('Preenchendo login...');
        await page.locator('input[type="email"]').first().fill('aryarajmarketing@gmail.com');
        await page.locator('input[type="password"]').first().fill('123456');
        await page.locator('button[type="submit"], button:has-text("Entrar")').first().click();

        await page.waitForTimeout(5000);

        // Selecionar cliente se necessário
        const hasNoClient = await page.locator('button:has-text("Sem cliente selecionado")').count();
        if (hasNoClient > 0) {
            await page.locator('button:has-text("Sem cliente selecionado")').click();
            await page.waitForTimeout(1000);
            await page.locator('div.max-h-60 button').first().click();
            await page.waitForTimeout(3000);
        }

        // Navegar para Atendimento
        console.log('Navegando para a página de Atendimento...');
        await page.locator('button:has-text("Atendimento"), aside button:has-text("Atendimento")').first().click();
        await page.waitForTimeout(3000);

        // Clicar na conversa
        console.log('Abrindo a conversa...');
        const convoItem = page.locator('div.divide-y > div, div.cursor-pointer').first();
        await convoItem.click();

        // Aguardar o carregamento de 100% da conversa
        await page.waitForTimeout(3000);

        console.log('Capturando evidência da badge de Custo da IA no rodapé da mensagem...');
        const pathAiCost = path.join(artifactDir, 'evidence_ai_cost_badge.png');
        await page.screenshot({ path: pathAiCost });
        await page.screenshot({ path: path.join(screenshotsDir, 'evidence_ai_cost_badge.png') });

        console.log('Evidência visual capturada com sucesso!');
    } finally {
        await browser.close();
    }
}

run().catch(err => {
    console.error('Erro ao capturar evidência visual de custo da IA:', err);
    process.exit(1);
});
