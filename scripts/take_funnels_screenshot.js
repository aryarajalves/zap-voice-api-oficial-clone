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

    // Navegar para o Meus Funis usando a Sidebar
    console.log('Navegando para Meus Funis via Sidebar...');
    await page.locator('aside button:has-text("Meus Funis")').click();
    await page.waitForTimeout(4000); // aguarda a página e as requisições carregarem
    
    // Tirar print da listagem de funis
    console.log('Tirando print da tela de Meus Funis...');
    const screenshotPath = path.join(dir, 'funnels_list_with_date.png');
    await page.screenshot({ path: screenshotPath });
    console.log(`Print salvo em: ${screenshotPath}`);
    
    // Também salva na pasta global do antigravity para visualização
    const globalRecordingsDir = 'C:\\Users\\aryar\\.gemini\\antigravity\\browser_recordings';
    if (fs.existsSync(globalRecordingsDir)) {
      const globalDest = path.join(globalRecordingsDir, 'funnels_list_with_date.png');
      fs.copyFileSync(screenshotPath, globalDest);
      console.log(`Print copiado para o diretório global: ${globalDest}`);
    }

  } catch (err) {
    console.error('Erro ao tirar screenshot de Meus Funis:', err);
    await page.screenshot({ path: path.join(dir, 'funnels_error.png') });
  } finally {
    await browser.close();
  }
}

run();
