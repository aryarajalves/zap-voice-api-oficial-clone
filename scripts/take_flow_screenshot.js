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
  
  // Capturar erros do console do navegador
  page.on('pageerror', exception => {
    console.log(`[BROWSER ERROR] ${exception.message}`);
    console.log(exception.stack);
  });

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`[BROWSER CONSOLE ERROR] ${msg.text()}`);
    } else {
      console.log(`[BROWSER CONSOLE] ${msg.text()}`);
    }
  });

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
    
    // Filtra por Histórico de Funis (para garantir que clicamos em um trigger com funil estruturado)
    console.log('Filtrando por Histórico de Funis para achar um com React Flow...');
    await page.locator('select').first().selectOption('single');
    await page.waitForTimeout(3000); // aguarda carregar

    // Clicar no botão "Ver Pipeline" do primeiro item do histórico de funis
    console.log('Abrindo o modal do Pipeline Visual de um Funil...');
    const pipelineButton = page.locator('button[title="Ver Pipeline"]').first();
    await pipelineButton.click();
    await page.waitForTimeout(4000); // aguardar renderização do canvas do React Flow
    
    // Tirar print do fluxo visual
    console.log('Tirando print do modal de Pipeline (Fluxo Visual)...');
    await page.screenshot({ path: 'scripts/screenshots/history_pipeline_flow.png' });
    console.log('Print salvo: scripts/screenshots/history_pipeline_flow.png');

    // Alternar para a aba Linha do Tempo
    console.log('Alternando para a aba Linha do Tempo...');
    await page.locator('button:has-text("Linha do Tempo")').click();
    await page.waitForTimeout(2000);

    // Tirar print da Linha do Tempo
    console.log('Tirando print do modal de Pipeline (Linha do Tempo)...');
    await page.screenshot({ path: 'scripts/screenshots/history_pipeline_timeline.png' });
    console.log('Print salvo: scripts/screenshots/history_pipeline_timeline.png');
    
  } catch (err) {
    console.error('Erro no script Playwright:', err);
    await page.screenshot({ path: 'scripts/screenshots/flow_error.png' });
  } finally {
    await browser.close();
  }
}

run();
