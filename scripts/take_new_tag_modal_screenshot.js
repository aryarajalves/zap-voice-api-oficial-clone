const { chromium } = require('playwright');
const path = require('path');

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    console.log('1. Navegando para o sistema...');
    await page.goto('http://localhost:5176', { waitUntil: 'domcontentloaded', timeout: 30000 });
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

    console.log('5. Clicando na primeira conversa...');
    const convoItem = page.locator('.group\\/convo').first();
    await convoItem.waitFor({ state: 'visible', timeout: 15000 });
    await convoItem.click();
    await page.waitForTimeout(3000);

    console.log('6. Digitando nova tag no campo de busca de marcadores...');
    const tagInput = page.locator('input[placeholder="Pesquisar ou criar marcador..."]');
    await tagInput.waitFor({ state: 'visible', timeout: 10000 });
    await tagInput.fill('teste_tete');
    await page.waitForTimeout(1000);

    console.log('7. Clicando em + Criar novo marcador...');
    const createBtn = page.locator('button:has-text("+ Criar novo marcador:")');
    await createBtn.waitFor({ state: 'visible', timeout: 5000 });
    await createBtn.click();
    await page.waitForTimeout(2000);

    console.log('8. Capturando screenshot com o modal de cor aberto...');
    const screenshotPath = path.join(__dirname, 'screenshots', 'evidence_new_tag_modal_opened.png');
    await page.screenshot({ path: screenshotPath });
    console.log(`Screenshot salvo com sucesso em: ${screenshotPath}`);

  } catch (err) {
    console.error('Erro:', err);
  } finally {
    await browser.close();
  }
}

run();
