const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function run() {
  const dir = path.join(__dirname, 'screenshots');
  if (!fs.existsSync(dir)){
    fs.mkdirSync(dir, { recursive: true });
  }

  console.log('Iniciando o navegador Chromium...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    console.log('Navegando para o frontend do ZapVoice...');
    await page.goto('http://localhost:5176', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);
    
    // Login
    console.log('Preenchendo credenciais de login...');
    await page.locator('input[type="email"]').first().fill('aryarajmarketing@gmail.com');
    await page.locator('input[type="password"]').first().fill('123456');
    await page.locator('button[type="submit"], button:has-text("Entrar")').first().click();
    
    console.log('Aguardando login...');
    await page.waitForTimeout(4000);
    
    // Definir cliente 11 (SST) no localStorage para carregar as etiquetas reais
    console.log('Definindo cliente ativo como 11 (SST)...');
    await page.evaluate(() => {
      localStorage.setItem('activeClientId', '11');
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);
    
    await page.setViewportSize({ width: 1280, height: 800 });

    // Navegar para Atendimento / Chat
    console.log('Navegando para Atendimento...');
    const atendimentoBtn = page.locator('button:has-text("Atendimento"), aside button:has-text("Atendimento")').first();
    await atendimentoBtn.click();
    await page.waitForTimeout(4000);

    // Clicar no botão "Marcador"
    console.log('Clicando na aba de filtro "Marcador"...');
    const marcadorBtn = page.locator('button:has-text("Marcador")').first();
    await marcadorBtn.click();
    await page.waitForTimeout(1000);

    // Clicar no seletor de Marcador para abrir o dropdown
    console.log('Clicando no seletor de Marcador...');
    const trigger = page.locator('#chat-label-filter-trigger');
    await trigger.click();
    await page.waitForTimeout(1200);

    // Tirar screenshot com o dropdown aberto exibindo a ausência total de scroll horizontal
    const dropdownOpenPath = path.join(dir, 'chat_marcador_no_hscroll.png');
    await page.screenshot({ path: dropdownOpenPath });
    console.log(`Screenshot salvo em: ${dropdownOpenPath}`);

  } catch (error) {
    console.error('Erro durante captura de tela:', error);
  } finally {
    await browser.close();
    console.log('Finalizado.');
  }
}

run();
