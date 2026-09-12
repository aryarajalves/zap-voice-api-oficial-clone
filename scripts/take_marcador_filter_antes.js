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
    await page.goto('http://localhost:5176', { waitUntil: 'networkidle', timeout: 30000 });
    
    // Login
    console.log('Preenchendo credenciais de login...');
    await page.locator('input[type="email"]').first().fill('aryarajmarketing@gmail.com');
    await page.locator('input[type="password"]').first().fill('123456');
    await page.locator('button[type="submit"], button:has-text("Entrar")').first().click();
    
    console.log('Aguardando o carregamento da interface...');
    await page.waitForTimeout(5000);
    
    // Selecionar cliente se não houver cliente ativo
    const hasNoClient = await page.locator('button:has-text("Sem cliente selecionado")').count();
    if (hasNoClient > 0) {
      console.log('Nenhum cliente ativo. Selecionando o primeiro disponível...');
      await page.locator('button:has-text("Sem cliente selecionado")').click();
      await page.waitForTimeout(1000);
      await page.locator('div.max-h-60 button').first().click();
      await page.waitForTimeout(3000);
    }
    
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
    await page.waitForTimeout(1500);

    // Tirar screenshot "Antes"
    const screenshotPath = path.join(dir, 'chat_marcador_filter_antes.png');
    await page.screenshot({ path: screenshotPath });
    console.log(`Screenshot 'Antes' capturado com sucesso em: ${screenshotPath}`);

  } catch (error) {
    console.error('Erro durante captura de tela:', error);
  } finally {
    await browser.close();
  }
}

run();
