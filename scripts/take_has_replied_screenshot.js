const { chromium } = require('playwright');
const path = require('path');

async function run() {
  const artifactPath = 'C:/Users/aryar/.gemini/antigravity/brain/330aac20-d3b6-42ba-8dfe-69131e763c2f/filtro_respondeu_screenshot.png';

  console.log('Iniciando Chromium...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    console.log('Navegando para o frontend...');
    await page.goto('http://localhost:5176', { waitUntil: 'networkidle', timeout: 30000 });
    
    // Login
    console.log('Preenchendo credenciais...');
    await page.locator('input[type="email"]').first().fill('aryarajmarketing@gmail.com');
    await page.locator('input[type="password"]').first().fill('123456');
    await page.locator('button[type="submit"], button:has-text("Entrar")').first().click();
    await page.waitForTimeout(5000);
    
    // Selecionar cliente se necessário
    const hasNoClient = await page.locator('button:has-text("Sem cliente selecionado")').count();
    if (hasNoClient > 0) {
      await page.locator('button:has-text("Sem cliente selecionado")').click();
      await page.waitForTimeout(1000);
      await page.locator('div.max-h-60 button').first().click();
      await page.waitForTimeout(3000);
    }
    
    await page.setViewportSize({ width: 1280, height: 900 });

    // Navegar para Atendimento
    console.log('Abrindo Atendimento...');
    await page.locator('button:has-text("Atendimento"), aside button:has-text("Atendimento")').first().click();
    await page.waitForTimeout(3000);

    // Clicar na aba de filtro "Status"
    console.log('Abrindo submenu de Status...');
    await page.locator('button:has-text("Status")').first().click();
    await page.waitForTimeout(1000);

    // Clicar no filtro "Respondeu"
    console.log('Ativando o filtro "Respondeu"...');
    await page.locator('button:has-text("Respondeu")').first().click();
    await page.waitForTimeout(2000);

    console.log('Capturando evidência visual...');
    await page.screenshot({ path: artifactPath, fullPage: false });
    console.log('Screenshot salva em:', artifactPath);
    
  } catch (err) {
    console.error('Erro na captura:', err);
  } finally {
    await browser.close();
  }
}

run();
