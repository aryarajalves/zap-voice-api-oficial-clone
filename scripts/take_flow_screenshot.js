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
    
    // Forçar a seleção de "Fonte Oculta" no seletor de clientes
    console.log('Forçando seleção do cliente Fonte Oculta...');
    const selectorButton = page.locator('button:has-text("Sem cliente selecionado"), button:has-text("ID:")').first();
    await selectorButton.click();
    await page.waitForTimeout(1000);
    await page.locator('div.max-h-60 button:has-text("Fonte Oculta")').first().click();
    await page.waitForTimeout(4000);
    
    // Definir viewport
    await page.setViewportSize({ width: 1280, height: 900 });

    // Navegar para o Histórico usando a Sidebar
    console.log('Navegando para o Histórico via Sidebar...');
    await page.locator('aside button:has-text("Histórico")').click();
    await page.waitForTimeout(4000); // aguarda a página e as requisições carregarem
    
    // Filtra por "Tudo" para ver os disparos em massa
    console.log('Filtrando por tudo...');
    await page.locator('select').first().selectOption('all');
    await page.waitForTimeout(3000); // aguarda carregar

    // Localizar a linha que contém o disparo em massa
    console.log('Localizando a linha do disparo em massa...');
    const row = page.locator('tr:has-text("boas_vindas_desbloqueioneural")').first();
    
    // Clicar no botão "Funis Ativados" para abrir a listagem de funis filhos
    console.log('Abrindo os funis filhos...');
    await row.locator('button:has-text("Funis Ativados")').click();
    await page.waitForTimeout(3000); // aguarda o modal secundário
    
    // Clicar no primeiro botão "Ver Pipeline" da listagem de funis filhos
    console.log('Abrindo o modal do Pipeline Visual do funil filho...');
    const childRow = page.locator('div.group:has-text("Aryaraj")').first();
    await childRow.locator('button:has-text("MONITORAR AO VIVO")').click();
    await page.waitForTimeout(5000); // aguardar renderização completa e timers do React Flow
    
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
