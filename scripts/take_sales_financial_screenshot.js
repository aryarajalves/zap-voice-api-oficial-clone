const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    console.log('Navegando para o ZapVoice...');
    await page.goto('http://localhost:5176', { waitUntil: 'networkidle', timeout: 30000 });
    
    // Login
    console.log('Realizando login...');
    await page.locator('input[type="email"]').first().fill('aryarajmarketing@gmail.com');
    await page.locator('input[type="password"]').first().fill('123456');
    await page.locator('button[type="submit"], button:has-text("Entrar")').first().click();
    
    console.log('Aguardando painel principal...');
    await page.waitForTimeout(5000); // aguardar login e animações
    
    // Selecionar cliente se não tiver
    const hasNoClient = await page.locator('button:has-text("Sem cliente selecionado")').count();
    if (hasNoClient > 0) {
      console.log('Nenhum cliente ativo. Selecionando o primeiro disponível...');
      await page.locator('button:has-text("Sem cliente selecionado")').click();
      await page.waitForTimeout(1000);
      await page.locator('div.max-h-60 button').first().click();
      await page.waitForTimeout(2000);
    }
    
    // Clicar em "Financeiro" na sidebar
    console.log('Navegando para a aba Financeiro...');
    await page.locator('span:has-text("Financeiro"), button:has-text("Financeiro")').first().click();
    await page.waitForTimeout(3000); // Aguarda carregar dados do faturamento
    
    // Definir viewport
    await page.setViewportSize({ width: 1280, height: 900 });
    
    // Tirar print da tela
    console.log('Tirando screenshot...');
    const destDir = 'scripts/screenshots';
    if (!fs.existsSync(destDir)){
      fs.mkdirSync(destDir, { recursive: true });
    }
    
    const screenshotPath = path.join(destDir, 'sales_financial_payment_method.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`Screenshot tirado com sucesso: ${screenshotPath}`);
    
    // Copiar para a pasta de artefatos
    const artifactDest = 'C:\\Users\\aryar\\.gemini\\antigravity\\brain\\c9f12fd7-0ff4-4587-a730-21a697f34976\\sales_financial_payment_method.png';
    fs.copyFileSync(screenshotPath, artifactDest);
    console.log(`Copiado para os artefatos: ${artifactDest}`);
    
  } catch (err) {
    console.error('Erro no script Playwright:', err);
  } finally {
    await browser.close();
  }
}

run();
