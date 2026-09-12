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

    // Abrir o dropdown de etiquetas
    console.log('4. Abrindo dropdown de etiquetas...');
    const tagFilterBtn = page.locator('#contacts-tag-filter-btn');
    if (await tagFilterBtn.count() > 0) {
      await tagFilterBtn.click();
      await page.waitForTimeout(1000);
    }

    // Tirar print ANTES
    console.log('5. Capturando tela ANTES...');
    const screenshotPath = path.join(dir, 'leads_tag_filter_antes.png');
    await page.screenshot({ path: screenshotPath });
    console.log(`Screenshot salvo em: ${screenshotPath}`);
    
  } catch (err) {
    console.error('Erro ao tirar screenshot:', err);
  } finally {
    await browser.close();
  }
}

run();
