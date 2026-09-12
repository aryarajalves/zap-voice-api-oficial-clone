const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function run() {
  const dir = path.join(__dirname, 'screenshots');
  if (!fs.existsSync(dir)){
    fs.mkdirSync(dir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    console.log('1. Acessando http://localhost:5176...');
    await page.goto('http://localhost:5176', { waitUntil: 'networkidle', timeout: 15000 });
    
    // Login
    console.log('2. Realizando login...');
    await page.locator('input[type="email"]').first().fill('aryarajmarketing@gmail.com');
    await page.locator('input[type="password"]').first().fill('123456');
    await page.locator('button[type="submit"], button:has-text("Entrar")').first().click();
    
    console.log('Aguardando painel principal...');
    await page.waitForTimeout(4000); 
    
    // Selecionar cliente se não houver cliente ativo
    const hasNoClient = await page.locator('button:has-text("Sem cliente selecionado")').count();
    if (hasNoClient > 0) {
      console.log('Nenhum cliente ativo. Selecionando o primeiro disponível...');
      await page.locator('button:has-text("Sem cliente selecionado")').click();
      await page.waitForTimeout(1000);
      await page.locator('div.max-h-60 button').first().click();
      await page.waitForTimeout(2000);
    }
    
    await page.setViewportSize({ width: 1280, height: 900 });

    // Navegar para Contatos
    console.log('3. Clicando em Contatos...');
    await page.locator('button:has-text("Contatos")').first().click();
    await page.waitForTimeout(3000);

    // Clicar no botão Sincronizar
    console.log('4. Clicando no botão Sincronizar...');
    const syncBtn = page.locator('button:has-text("Sincronizar")').first();
    if (await syncBtn.count() > 0) {
      await syncBtn.click();
      await page.waitForTimeout(1000);
    }

    // Tirar print do modal aberto
    console.log('5. Capturando tela do modal de Sincronizar e Deduplicar...');
    const screenshotPath = path.join(dir, 'sincronizar_deduplicar_modal.png');
    await page.screenshot({ path: screenshotPath });
    console.log(`Screenshot salvo em: ${screenshotPath}`);
    
  } catch (err) {
    console.error('Erro ao tirar screenshot:', err);
  } finally {
    await browser.close();
  }
}

run();
