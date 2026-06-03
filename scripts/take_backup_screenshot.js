const { chromium } = require('playwright');
const path = require('path');

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    console.log('1. Navegando para a página de login...');
    await page.goto('http://localhost:5176', { waitUntil: 'networkidle', timeout: 30000 });
    
    // Verifica se os campos de login estão presentes
    const isLoginPage = await page.locator('input[type="email"]').count() > 0;
    if (isLoginPage) {
      console.log('2. Realizando login...');
      await page.locator('input[type="email"]').first().fill('aryarajmarketing@gmail.com');
      await page.locator('input[type="password"]').first().fill('123456');
      await page.locator('button[type="submit"], button:has-text("Entrar")').first().click();
      await page.waitForTimeout(6000); 
    } else {
      console.log('2. Já logado ou em outra página, ignorando etapa de login.');
    }
    
    console.log('3. Navegando para Backup...');
    await page.goto('http://localhost:5176/backup', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(4000);

    console.log('4. Capturando tela com a prova visual...');
    const screenshotPath = path.join(__dirname, 'screenshots', 'backup_pinned_tags.png');
    await page.screenshot({ path: screenshotPath });
    console.log(`Visual Screenshot saved successfully to: ${screenshotPath}`);
    
  } catch (err) {
    console.error('Erro ao tirar screenshot de validação visual:', err);
    try {
      const errorScreenshotPath = path.join(__dirname, 'screenshots', 'backup_error_state.png');
      await page.screenshot({ path: errorScreenshotPath });
      console.log(`Fallback error screenshot saved to: ${errorScreenshotPath}`);
    } catch (e) {}
  } finally {
    await browser.close();
  }
}

run();
