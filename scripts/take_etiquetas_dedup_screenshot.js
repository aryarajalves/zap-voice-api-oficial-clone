const { chromium } = require('playwright');
const path = require('path');

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();
  
  const artifactDir = path.resolve('C:/Users/aryar/.gemini/antigravity/brain/cd8b77a3-efbf-4889-8f89-3bbf669a5fb4');
  const outputPath = path.join(artifactDir, 'etiquetas_sem_duplicacao_depois.png');

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

    console.log('4. Clicando em Integrações Webhook no menu...');
    const integrationsMenu = page.locator('button:has-text("Integrações Webhook")').first();
    await integrationsMenu.click();
    await page.waitForTimeout(2500);

    console.log('5. Clicando no botão de editar da integração Kiwify...');
    const editBtn = page.locator('button[title*="Editar"], button:has-text("Editar")').first();
    await editBtn.click();
    await page.waitForTimeout(2000);

    console.log('6. Clicando na aba Gatilhos do modal...');
    const gatilhosTab = page.locator('button:has-text("Gatilhos")').last();
    await gatilhosTab.click();
    await page.waitForTimeout(1500);

    console.log('7. Clicando na aba "Contato & Tags"...');
    const contatoTagsTab = page.locator('button:has-text("Contato & Tags")').first();
    await contatoTagsTab.click();
    await page.waitForTimeout(1500);

    console.log('8. Clicando no SearchableSelect de Etiquetas na conversa...');
    const selectTrigger = page.locator('div:has-text("Etiquetas na conversa (Chat Local)")').locator('..').locator('.group\\/sel, [class*="cursor-pointer"]').first();
    await selectTrigger.click();
    await page.waitForTimeout(1000);

    console.log('9. Digitando termo de busca "compra"...');
    const searchInput = page.locator('input[placeholder="Digite para buscar..."]').first();
    await searchInput.fill('compra');
    await page.waitForTimeout(1500);

    console.log('10. Capturando screenshot da validação...');
    await page.screenshot({ path: outputPath, fullPage: false });
    console.log('✅ Screenshot salvo com sucesso em:', outputPath);

  } catch (err) {
    console.error('Erro durante o screenshot:', err);
    try {
      await page.screenshot({ path: outputPath });
    } catch (e) {}
  } finally {
    await browser.close();
  }
}

run();
