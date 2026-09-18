const { chromium } = require('playwright');
const path = require('path');

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  
  try {
    console.log('1. Navegando para o sistema...');
    await page.goto('http://localhost:5176', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    
    const isLoginPage = (await page.locator('input[type="email"]').count()) > 0;
    if (isLoginPage) {
      console.log('2. Realizando login...');
      await page.locator('input[type="email"]').first().fill('aryarajmarketing@gmail.com');
      await page.locator('input[type="password"]').first().fill('123456');
      await page.locator('button[type="submit"], button:has-text("Entrar")').first().click();
      await page.waitForTimeout(4000);
    }
    
    console.log('3. Configurando activeClientId para 11 (SST)...');
    await page.evaluate(() => { localStorage.setItem('activeClientId', '11'); });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    
    console.log('4. Navegando para Atendimento...');
    const atendimentoBtn = page.locator('button:has-text("Atendimento"), aside button:has-text("Atendimento")').first();
    await atendimentoBtn.click();
    await page.waitForTimeout(4000);
    
    console.log('5. Clicando em uma conversa da lista para abrir a troca de mensagens...');
    const convoCards = page.locator('div[class*="cursor-pointer"]');
    if (await convoCards.count() > 1) {
      await convoCards.nth(1).click();
      await page.waitForTimeout(3000);
    }
    
    const outPath = path.join(__dirname, 'screenshots', 'evidence_chat_2500_conversas.png');
    await page.screenshot({ path: outPath });
    console.log('Screenshot salva com sucesso em:', outPath);
  } catch (err) {
    console.error('Erro:', err);
  } finally {
    await browser.close();
  }
}

run();
