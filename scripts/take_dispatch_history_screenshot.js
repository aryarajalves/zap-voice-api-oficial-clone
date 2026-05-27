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
    
    console.log('Aguardando painel principal e hidratação...');
    await page.waitForTimeout(8000); // aguardar login, animações e hidratação completa do React
    
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

    // Navegar para Integrações Webhook via Sidebar usando o botão exato e force click
    console.log('Navegando para Integrações Webhook...');
    const integrationsBtn = page.locator('aside button:has-text("Integrações Webhook")').first();
    await integrationsBtn.waitFor({ state: 'visible' });
    await page.waitForTimeout(2000); // garante estabilização
    await integrationsBtn.click({ force: true });
    await page.waitForTimeout(4000); // aguarda a renderização da página de integrações

    // Clicar no botão "Disparos" da primeira integração da tabela no painel principal (main)
    console.log('Abrindo o Histórico de Disparos de uma integração...');
    const disparosBtn = page.locator('main button:has-text("Disparos")').first();
    await disparosBtn.waitFor({ state: 'visible' });
    await disparosBtn.click();
    await page.waitForTimeout(4000); // aguarda o modal abrir e carregar as estatísticas e disparos

    // Tirar print do modal com a nova Stats Bar compactada
    console.log('Capturando o estado final com a Stats Bar compactada...');
    await page.screenshot({ path: 'scripts/screenshots/dispatch_history_compact_stats.png' });
    console.log('Screenshot salvo com sucesso: scripts/screenshots/dispatch_history_compact_stats.png');
    
  } catch (err) {
    console.error('Erro ao tirar screenshot do histórico de disparos:', err);
    await page.screenshot({ path: 'scripts/screenshots/dispatch_history_error.png' });
  } finally {
    await browser.close();
  }
}

run();
