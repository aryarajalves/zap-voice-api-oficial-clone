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
    const configBtn = page.locator('button:has-text("Configurações")');
    await configBtn.waitFor({ state: 'visible', timeout: 15000 });
    await configBtn.click();
    await page.waitForTimeout(2000);

    console.log('4. Clicando na aba Marcadores...');
    const marcadoresTab = page.locator('button:has-text("Marcadores")');
    await marcadoresTab.waitFor({ state: 'visible', timeout: 10000 });
    await marcadoresTab.click();
    await page.waitForTimeout(3000);

    console.log('5. Localizando botão de transferir em um dos cards...');
    const transferBtn = page.locator('button[title*="Transferir"]').first();
    await transferBtn.waitFor({ state: 'visible', timeout: 10000 });
    console.log('5.1. Clicando no botão de transferir contatos...');
    await transferBtn.click();
    await page.waitForTimeout(2000);

    console.log('6. Aguardando modal de transferência ser renderizado...');
    const modalConfirmBtn = page.locator('#btn-confirm-transfer');
    await modalConfirmBtn.waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForTimeout(1000);

    console.log('7. Capturando screenshot do TransferLabelModal...');
    const screenshotPath = path.join(__dirname, 'screenshots', 'evidence_transfer_label_modal.png');
    await page.screenshot({ path: screenshotPath });
    console.log(`Visual Screenshot salvo com sucesso em: ${screenshotPath}`);

  } catch (err) {
    console.error('Erro ao tirar screenshot do modal de transferência:', err);
    try {
      const errorScreenshotPath = path.join(__dirname, 'screenshots', 'evidence_transfer_error.png');
      await page.screenshot({ path: errorScreenshotPath });
      console.log(`Fallback error screenshot salvo em: ${errorScreenshotPath}`);
    } catch (e) {}
  } finally {
    await browser.close();
  }
}

run();
