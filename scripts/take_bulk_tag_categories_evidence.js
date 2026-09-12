const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function run() {
  const dir = path.join(__dirname, 'screenshots');
  if (!fs.existsSync(dir)){
    fs.mkdirSync(dir, { recursive: true });
  }

  console.log('Iniciando Chromium...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    console.log('Navegando para o frontend via 127.0.0.1:5176...');
    await page.goto('http://127.0.0.1:5176', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);
    
    // Login
    console.log('Login...');
    await page.locator('input[type="email"]').first().fill('aryarajmarketing@gmail.com');
    await page.locator('input[type="password"]').first().fill('123456');
    await page.locator('button[type="submit"], button:has-text("Entrar")').first().click();
    await page.waitForTimeout(4000);
    
    // Cliente 11
    console.log('Set activeClientId=11...');
    await page.evaluate(() => {
      localStorage.setItem('activeClientId', '11');
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);
    
    await page.setViewportSize({ width: 1280, height: 800 });

    // Navegar para Atendimento
    console.log('Navegando para Atendimento...');
    const atendimentoBtn = page.locator('button:has-text("Atendimento"), aside button:has-text("Atendimento")').first();
    await atendimentoBtn.click();
    await page.waitForTimeout(4000);

    // Selecionar conversa
    console.log('Selecionando conversa...');
    const checkboxes = page.locator('input[type="checkbox"]');
    const count = await checkboxes.count();
    if (count > 1) {
      await checkboxes.nth(1).check();
      await page.waitForTimeout(800);
    }

    // Clicar em Etiquetar
    console.log('Clicando em Etiquetar...');
    const tagBtn = page.locator('button:has-text("Etiquetar")').first();
    await tagBtn.click();
    await page.waitForTimeout(1000);

    // 1. Screenshot com "Etiqueta do Chat" ativa
    const chatCatPath = path.join(dir, 'chat_bulk_tag_category_chat.png');
    await page.screenshot({ path: chatCatPath });
    console.log(`Screenshot Chat salvo em: ${chatCatPath}`);

    // Clicar em "Aba de Contatos"
    console.log('Clicando em "Aba de Contatos"...');
    const contactsCatBtn = page.locator('#btn-category-contacts');
    await contactsCatBtn.click();
    await page.waitForTimeout(1000);

    // 2. Screenshot com "Aba de Contatos" ativa
    const contactsCatPath = path.join(dir, 'chat_bulk_tag_category_contacts.png');
    await page.screenshot({ path: contactsCatPath });
    console.log(`Screenshot Contatos salvo em: ${contactsCatPath}`);

  } catch (err) {
    console.error('Erro:', err);
  } finally {
    await browser.close();
    console.log('Concluído.');
  }
}

run();
