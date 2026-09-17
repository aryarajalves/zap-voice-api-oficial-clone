const { chromium } = require('playwright');
const path = require('path');

async function run() {
  const browser = await chromium.launch({ headless: true });
  // Viewport padrão de laptop (1366x768) para testar exatamente onde ocorria o corte/vazamento
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await context.newPage();

  try {
    console.log('1. Navegando para o sistema...');
    await page.goto('http://127.0.0.1:5176', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);

    const isLoginPage = (await page.locator('input[type="email"]').count()) > 0;
    if (isLoginPage) {
      console.log('2. Realizando login...');
      await page.locator('input[type="email"]').first().fill('aryarajmarketing@gmail.com');
      await page.locator('input[type="password"]').first().fill('123456');
      await page.locator('button[type="submit"], button:has-text("Entrar")').first().click();
      await page.waitForTimeout(4000);
    }

    console.log('3. Configurando activeClientId para 11...');
    await page.evaluate(() => {
      localStorage.setItem('activeClientId', '11');
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    console.log('4. Clicando em Atendimento na sidebar...');
    const chatNavBtn = page.locator('button:has-text("Atendimento")').first();
    await chatNavBtn.waitFor({ state: 'visible', timeout: 15000 });
    await chatNavBtn.click();
    await page.waitForTimeout(4000);

    console.log('5. Selecionando conversa para ação em massa...');
    const selectAllBtn = page.locator('button:has-text("Selecionar todas")');
    if (await selectAllBtn.count() > 0) {
      await selectAllBtn.click();
    } else {
      // Fallback: clica no checkbox da primeira conversa
      const firstCheckbox = page.locator('input[type="checkbox"]').first();
      await firstCheckbox.click();
    }
    await page.waitForTimeout(1500);

    console.log('6. Clicando no botão Etiquetar...');
    const bulkTagBtn = page.locator('#bulk-tag-btn');
    await bulkTagBtn.waitFor({ state: 'visible', timeout: 5000 });
    await bulkTagBtn.click();
    await page.waitForTimeout(2000);

    console.log('7. Clicando em 4 etiquetas disponíveis para simular a seleção...');
    const availableTagButtons = page.locator('.max-h-36 button, .max-h-40 button, .max-h-48 button');
    const count = await availableTagButtons.count();
    console.log(`Encontradas ${count} etiquetas disponíveis.`);
    for (let i = 0; i < Math.min(count, 4); i++) {
      await availableTagButtons.nth(i).click();
      await page.waitForTimeout(400);
    }

    await page.waitForTimeout(1500);

    console.log('8. Capturando screenshot do modal ajustado...');
    const screenshotPath = path.join(__dirname, 'screenshots', 'evidence_bulk_tag_modal_fixed.png');
    await page.screenshot({ path: screenshotPath });
    console.log(`Screenshot salvo com sucesso em: ${screenshotPath}`);

  } catch (err) {
    console.error('Erro na automação:', err);
    try {
      const errorScreenshotPath = path.join(__dirname, 'screenshots', 'evidence_bulk_tag_modal_error.png');
      await page.screenshot({ path: errorScreenshotPath });
    } catch (e) {}
  } finally {
    await browser.close();
  }
}

run();
