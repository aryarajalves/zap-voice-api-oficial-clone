const { chromium } = require('playwright');
const path = require('path');

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();
  
  try {
    console.log('1. Navegando para o sistema local...');
    await page.goto('http://127.0.0.1:5176', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);
    
    // Verifica se os campos de login estão presentes
    const isLoginPage = (await page.locator('input[type="email"]').count()) > 0;
    if (isLoginPage) {
      console.log('2. Realizando login com credenciais de desenvolvimento...');
      await page.locator('input[type="email"]').first().fill('aryarajmarketing@gmail.com');
      await page.locator('input[type="password"]').first().fill('123456');
      await page.locator('button[type="submit"], button:has-text("Entrar")').first().click();
      await page.waitForTimeout(4000);
    }
    
    console.log('2.1. Configurando activeClientId para 11 (cliente SST com etiquetas)...');
    await page.evaluate(() => {
      localStorage.setItem('activeClientId', '11');
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    
    console.log('3. Aguardando sidebar e abrindo Configurações...');
    // Clica no botão Configurações na sidebar
    const configBtn = page.locator('button:has-text("Configurações")');
    await configBtn.waitFor({ state: 'visible', timeout: 15000 });
    await configBtn.click();
    await page.waitForTimeout(2000);

    console.log('4. Clicando na aba Marcadores...');
    const marcadoresTab = page.locator('button:has-text("Marcadores")');
    await marcadoresTab.waitFor({ state: 'visible', timeout: 10000 });
    await marcadoresTab.click();
    await page.waitForTimeout(3000);

    console.log('4.1. Rolando painel até a paginação...');
    const scrollablePanel = page.locator('form .overflow-y-auto').first();
    await scrollablePanel.evaluate(el => el.scrollTop = el.scrollHeight);
    await page.waitForTimeout(1000);

    console.log('5. Capturando screenshot da aba Marcadores com paginação (Página 1)...');
    const screenshotPath = path.join(__dirname, 'screenshots', 'evidence_marcadores_paginacao.png');
    await page.screenshot({ path: screenshotPath });
    console.log(`Visual Screenshot salvo com sucesso em: ${screenshotPath}`);

    console.log('6. Clicando na página 2 da paginação...');
    const page2Btn = page.locator('button:has-text("2")').last();
    await page2Btn.click();
    await page.waitForTimeout(1500);

    console.log('7. Capturando screenshot da Página 2...');
    const screenshotPath2 = path.join(__dirname, 'screenshots', 'evidence_marcadores_paginacao_page2.png');
    await page.screenshot({ path: screenshotPath2 });
    console.log(`Visual Screenshot Página 2 salvo com sucesso em: ${screenshotPath2}`);

  } catch (err) {
    console.error('Erro ao tirar screenshot da aba Marcadores:', err);
    try {
      const errorScreenshotPath = path.join(__dirname, 'screenshots', 'evidence_marcadores_error.png');
      await page.screenshot({ path: errorScreenshotPath });
      console.log(`Fallback error screenshot salvo em: ${errorScreenshotPath}`);
    } catch (e) {}
  } finally {
    await browser.close();
  }
}

run();
