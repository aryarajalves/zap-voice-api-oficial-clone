const { chromium } = require('playwright');
const path = require('path');

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();
  
  const artifactDir = path.resolve('C:/Users/aryar/.gemini/antigravity/brain/cd8b77a3-efbf-4889-8f89-3bbf669a5fb4');
  const outputPath = path.join(artifactDir, 'etiqueta_limite_25_depois.png');

  try {
    console.log('1. Navegando para o sistema local...');
    await page.goto('http://localhost:5176', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);
    
    // Login
    const isLoginPage = (await page.locator('input[type="email"]').count()) > 0;
    if (isLoginPage) {
      console.log('2. Realizando login...');
      await page.locator('input[type="email"]').first().fill('aryarajmarketing@gmail.com');
      await page.locator('input[type="password"]').first().fill('123456');
      await page.locator('button[type="submit"], button:has-text("Entrar")').first().click();
      await page.waitForTimeout(4000);
    }
    
    console.log('3. Selecionando cliente 11 (SST) no localStorage...');
    await page.evaluate(() => {
      localStorage.setItem('activeClientId', '11');
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    console.log('4. Clicando no botão Configurações...');
    const settingsBtn = page.locator('button:has-text("Configurações"), [title*="Configurações"]').first();
    if (await settingsBtn.count() > 0) {
      await settingsBtn.click();
    } else {
      await page.locator('button').filter({ hasText: /config/i }).first().click();
    }
    await page.waitForTimeout(2000);

    console.log('5. Clicando na aba Marcadores...');
    const marcadoresTab = page.locator('button:has-text("Marcadores")').first();
    await marcadoresTab.click();
    await page.waitForTimeout(2000);

    console.log('6. Digitando no campo de etiqueta...');
    const inputName = page.locator('input[placeholder="Ex: Suporte, Lead Quente..."]').first();
    await inputName.fill('Cliente VIP Black');
    await page.waitForTimeout(1000);

    console.log('7. Capturando screenshot...');
    await page.screenshot({ path: outputPath });
    console.log('Screenshot salvo com sucesso em:', outputPath);

  } catch (err) {
    console.error('Erro na captura:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
