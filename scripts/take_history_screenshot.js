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

    // Navegar para o Histórico usando a Sidebar
    console.log('Navegando para o Histórico via Sidebar...');
    await page.locator('aside button:has-text("Histórico")').click();
    await page.waitForTimeout(4000); // aguarda a página e as requisições carregarem
    
    // Tirar print padrão do histórico
    console.log('Tirando print padrão do histórico...');
    await page.screenshot({ path: 'scripts/screenshots/history_default.png' });
    console.log('Print salvo: scripts/screenshots/history_default.png');
    
    // Selecionar o filtro "Disparos Recorrentes"
    console.log('Selecionando o filtro "Disparos Recorrentes"...');
    // Encontra o select do tipo de trigger
    await page.locator('select').first().selectOption('recurring');
    await page.waitForTimeout(3000); // aguarda a requisição do filtro carregar
    
    // Tirar print da tabela filtrada por disparos recorrentes
    console.log('Tirando print do histórico filtrado por Disparos Recorrentes...');
    await page.screenshot({ path: 'scripts/screenshots/history_filtered_recurring.png' });
    console.log('Print salvo: scripts/screenshots/history_filtered_recurring.png');
    
  } catch (err) {
    console.error('Erro ao tirar screenshot do histórico:', err);
    await page.screenshot({ path: 'scripts/screenshots/history_error.png' });
  } finally {
    await browser.close();
  }
}

run();
