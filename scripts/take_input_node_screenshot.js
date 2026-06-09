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
    await page.goto('http://localhost:5176');
    await page.waitForSelector('input[type="email"]');
    
    // Login
    console.log('Realizando login...');
    await page.locator('input[type="email"]').first().fill('aryarajmarketing@gmail.com');
    await page.locator('input[type="password"]').first().fill('123456');
    await page.locator('button[type="submit"], button:has-text("Entrar")').first().click();
    
    console.log('Aguardando painel principal...');
    await page.waitForTimeout(6000);
    
    // Selecionar cliente
    const hasNoClient = await page.locator('button:has-text("Sem cliente selecionado")').count();
    if (hasNoClient > 0) {
      await page.locator('button:has-text("Sem cliente selecionado")').click();
      await page.waitForTimeout(1000);
      await page.locator('div.max-h-60 button').first().click();
      await page.waitForTimeout(3000);
    }
    
    await page.setViewportSize({ width: 1280, height: 900 });

    // Navegar para Meus Funis
    console.log('Navegando para Meus Funis...');
    await page.locator('aside button:has-text("Meus Funis")').click();
    await page.waitForTimeout(4000);

    // Clicar em "Novo Funil"
    console.log('Criando novo funil...');
    await page.locator('button:has-text("Novo Funil")').click();
    await page.waitForTimeout(4000);

    // Abrir menu de contexto no canvas
    console.log('Abrindo menu de contexto...');
    await page.click(".react-flow__renderer", { button: 'right', position: { x: 400, y: 400 } });
    await page.waitForTimeout(1000);

    // Adicionar nó "Entrada de Dados"
    console.log('Adicionando nó Entrada de Dados...');
    await page.locator('button:has-text("Entrada de Dados")').click();
    await page.waitForTimeout(2000);

    // Selecionar tipo de coleta "Inteligente por IA (LLM)"
    console.log('Selecionando tipo de coleta inteligente...');
    await page.locator('select').first().selectOption('ai');
    await page.waitForTimeout(1000);

    // Tirar print antes da alteração
    console.log('Tirando print "Antes"...');
    await page.screenshot({ path: 'scripts/screenshots/input_node_before.png' });
    console.log('Print salvo: scripts/screenshots/input_node_before.png');

  } catch (err) {
    console.error('Erro:', err);
  } finally {
    await browser.close();
  }
}

run();
