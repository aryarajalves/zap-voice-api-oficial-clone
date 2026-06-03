const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function run() {
  const targetDir = 'C:\\Users\\aryar\\.gemini\\antigravity\\brain\\1ba7dfb9-feaa-4acf-a88a-40f740aba160';
  if (!fs.existsSync(targetDir)){
    fs.mkdirSync(targetDir, { recursive: true });
  }
  const screenshotPath = path.join(targetDir, 'pinned_in_dropdown_screenshot.png');

  console.log('Iniciando o navegador Playwright...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    console.log('Navegando para o ZapVoice...');
    await page.goto('http://localhost:5176', { waitUntil: 'networkidle', timeout: 30000 });
    
    // Login
    console.log('Realizando login...');
    await page.locator('input[type="email"]').first().fill('aryarajmarketing@gmail.com');
    await page.locator('input[type="password"]').first().fill('123456');
    await page.locator('button[type="submit"], button:has-text("Entrar")').first().click();
    
    console.log('Aguardando painel principal...');
    await page.waitForTimeout(6000); // aguardar login e animações
    
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

    // Navegar para Integrações Webhook usando a Sidebar
    console.log('Navegando para Integrações Webhook via Sidebar...');
    await page.locator('aside button:has-text("Integrações Webhook")').click();
    await page.waitForTimeout(4000);
    
    // Clicar em "Nova Integração"
    console.log('Abrindo modal de Nova Integração...');
    await page.locator('button:has-text("Nova Integração")').click();
    await page.waitForTimeout(2000);
    
    // Clicar em "Novo Gatilho"
    console.log('Adicionando novo gatilho...');
    await page.locator('button:has-text("Novo Gatilho")').click();
    await page.waitForTimeout(1000);
    
    // Clicar no dropdown do Funil ZapVoice
    console.log('Clicando no seletor de Funil ZapVoice...');
    await page.locator('div:has-text("Selecione um Funil...")').last().click();
    await page.waitForTimeout(2000);
    
    // Capturar a tela mostrando a lista com o ícone de alfinete (📌)
    console.log(`Tirando print da tela de dropdown aberto e salvando em: ${screenshotPath}`);
    await page.screenshot({ path: screenshotPath });
    console.log('Print tirado com sucesso!');
    
  } catch (err) {
    console.error('Erro durante o fluxo:', err);
    await page.screenshot({ path: path.join(__dirname, 'dropdown_error.png') });
  } finally {
    await browser.close();
  }
}

run();
