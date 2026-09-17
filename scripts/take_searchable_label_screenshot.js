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
    
    console.log('2.1. Configurando activeClientId para 11 (SST)...');
    await page.evaluate(() => {
      localStorage.setItem('activeClientId', '11');
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    
    console.log('3. Abrindo Configurações...');
    const configBtn = page.locator('button:has-text("Configurações")');
    await configBtn.waitFor({ state: 'visible', timeout: 15000 });
    await configBtn.click();
    await page.waitForTimeout(2000);

    console.log('4. Clicando na aba Marcadores...');
    const marcadoresTab = page.locator('button:has-text("Marcadores")');
    await marcadoresTab.waitFor({ state: 'visible', timeout: 10000 });
    await marcadoresTab.click();
    await page.waitForTimeout(3000);

    console.log('5. Clicando no botão de transferir para abrir o modal...');
    const transferBtn = page.locator('button[title*="Transferir"]').first();
    await transferBtn.waitFor({ state: 'visible', timeout: 10000 });
    await transferBtn.click();
    await page.waitForTimeout(2000);

    console.log('6. Clicando no seletor pesquisável de etiqueta de destino...');
    const searchTrigger = page.locator('#btn-label-search-trigger');
    await searchTrigger.waitFor({ state: 'visible', timeout: 10000 });
    await searchTrigger.click();
    await page.waitForTimeout(1000);

    console.log('7. Digitando termo de busca "lead" no input do seletor...');
    const searchInput = page.locator('#input-search-label-filter');
    await searchInput.waitFor({ state: 'visible', timeout: 5000 });
    await searchInput.fill('lead');
    await page.waitForTimeout(1500);

    console.log('8. Capturando screenshot com o dropdown de busca aberto e filtrado...');
    const screenshotPath = path.join(__dirname, 'screenshots', 'evidence_searchable_label_select.png');
    await page.screenshot({ path: screenshotPath });
    console.log(`Screenshot do seletor pesquisável salvo em: ${screenshotPath}`);

  } catch (err) {
    console.error('Erro ao tirar screenshot do seletor pesquisável:', err);
    try {
      const errorScreenshotPath = path.join(__dirname, 'screenshots', 'evidence_search_error.png');
      await page.screenshot({ path: errorScreenshotPath });
      console.log(`Fallback error screenshot salvo em: ${errorScreenshotPath}`);
    } catch (e) {}
  } finally {
    await browser.close();
  }
}

run();
