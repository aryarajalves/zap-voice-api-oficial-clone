const { chromium } = require('playwright');
const path = require('path');

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    console.log('Navegando para o ZapVoice...');
    await page.goto('http://localhost:5176', { waitUntil: 'networkidle', timeout: 30000 });
    
    // Tirar print da tela de login
    await page.screenshot({ path: 'scripts/screenshots/v3.7.7_login.png' });
    console.log('Login screen capturada.');
    
    // Login
    await page.locator('input[type="email"]').first().fill('aryarajmarketing@gmail.com');
    await page.locator('input[type="password"]').first().fill('123456');
    await page.locator('button[type="submit"], button:has-text("Entrar")').first().click();
    
    console.log('Aguardando painel principal...');
    await page.waitForTimeout(5000); // aguardar login
    
    // Tirar print do dashboard
    await page.screenshot({ path: 'scripts/screenshots/v3.7.7_dashboard.png' });
    console.log('Dashboard capturado com sucesso.');
    
  } catch (err) {
    console.error('Erro na validação:', err);
    await page.screenshot({ path: 'scripts/screenshots/v3.7.7_error.png' });
  } finally {
    await browser.close();
  }
}

run();
