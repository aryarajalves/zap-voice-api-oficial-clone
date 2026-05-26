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
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.error('PAGE ERROR:', err.message));
  
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

    // Navegar para Contatos via Sidebar
    console.log('Navegando para a aba Contatos...');
    await page.locator('aside button:has-text("Contatos")').first().click();
    await page.waitForTimeout(4000);
    
    // Clicar em "Importar"
    console.log('Clicando em Importar...');
    await page.locator('button:has-text("Importar")').click({ force: true });
    await page.waitForTimeout(2000); // aguarda modal abrir
    
    // Tirar print das opções do modal de importação (Passo 1 inicial)
    console.log('Tirando print das opções de importação...');
    await page.screenshot({ path: 'scripts/screenshots/import_options.png' });
    console.log('Print salvo: scripts/screenshots/import_options.png');
    
    // Clicar na opção "Importar do Chatwoot"
    console.log('Clicando em Importar do Chatwoot...');
    await page.locator('div:has-text("Importar do Chatwoot")').last().click();
    await page.waitForTimeout(2000); // aguarda formulário de tags carregar
    
    // Tirar print das configurações do Chatwoot import
    console.log('Tirando print das configurações do Chatwoot import...');
    await page.screenshot({ path: 'scripts/screenshots/chatwoot_import_form.png' });
    console.log('Print salvo: scripts/screenshots/chatwoot_import_form.png');
    
  } catch (err) {
    console.error('Erro ao tirar screenshot:', err);
    await page.screenshot({ path: 'scripts/screenshots/import_error.png' });
  } finally {
    await browser.close();
  }
}

run();
