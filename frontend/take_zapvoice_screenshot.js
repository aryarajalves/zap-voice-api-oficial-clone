import { chromium } from 'playwright';
import path from 'path';

async function run() {
    console.log("Iniciando Chromium...");
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1280, height: 900 });

    try {
        console.log("Acessando login...");
        await page.goto('http://localhost:5173/login', { timeout: 30000, waitUntil: 'networkidle' });

        console.log("Limpando e preenchendo credenciais...");
        const emailInput = page.locator('input[type="email"]');
        const passwordInput = page.locator('input[type="password"]');

        await emailInput.fill('');
        await emailInput.type('aryarajmarketing@gmail.com', { delay: 50 });

        await passwordInput.fill('');
        await passwordInput.type('123456', { delay: 50 });

        console.log("Submetendo login...");
        await page.locator('button[type="submit"], button:has-text("Entrar")').first().click();

        console.log("Aguardando redirecionamento...");
        await page.waitForURL('**/integrations/**', { timeout: 15000 });
        await page.waitForLoadState('networkidle');

        console.log("Expandindo primeiro gatilho/mapeamento...");
        const triggerHeader = page.locator('span:has-text("Gatilho #")').first();
        await triggerHeader.click();
        await page.waitForTimeout(2000); // Aguardar animação de expansão

        const screenshotPath = '/app/screenshot_etiqueta_interna.png';
        console.log(`Tirando screenshot da nova interface de Mapeamento: ${screenshotPath}`);
        await page.screenshot({ path: screenshotPath, fullPage: false });
        console.log("Screenshot salva com sucesso!");
    } catch (err) {
        console.error("Erro na automação de captura:", err);
    } finally {
        await browser.close();
    }
}

run();
