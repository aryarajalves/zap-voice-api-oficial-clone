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
    await page.waitForTimeout(6000); 
    
    // Selecionar cliente se não houver cliente ativo
    const hasNoClient = await page.locator('button:has-text("Sem cliente selecionado")').count();
    if (hasNoClient > 0) {
      console.log('Nenhum cliente ativo. Selecionando o primeiro disponível...');
      await page.locator('button:has-text("Sem cliente selecionado")').click();
      await page.waitForTimeout(1000);
      await page.locator('div.max-h-60 button').first().click();
      await page.waitForTimeout(3000);
    }
    
    // Definir viewport
    await page.setViewportSize({ width: 1280, height: 900 });

    // Navegar para Integrações Webhook
    console.log('3. Clicando em Integrações Webhook...');
    await page.locator('text=Integrações Webhook').first().click();
    await page.waitForTimeout(3000);

    // Clicar no botão "Disparos" (Disparos)
    console.log('4. Abrindo o modal de Disparos da primeira integração...');
    const dispatchesBtn = page.locator('button:has-text("Disparos")').first();
    await dispatchesBtn.click({ force: true });
    await page.waitForTimeout(4000);

    // Tirar print
    console.log('5. Capturando tela com a prova visual dos disparos...');
    const screenshotPath = path.join(dir, 'disparos_erros_traduzidos.png');
    await page.screenshot({ path: screenshotPath });
    console.log(`Visual Screenshot saved successfully to: ${screenshotPath}`);
    
  } catch (err) {
    console.error('Erro ao tirar screenshot de validação visual:', err);
    await page.screenshot({ path: path.join(dir, 'disparos_error.png') }).catch(() => {});
  } finally {
    browser.close();
  }
}

run();
