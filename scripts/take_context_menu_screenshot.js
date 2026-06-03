const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function run() {
  const artifactDir = 'C:\\Users\\aryar\\.gemini\\antigravity\\brain\\7ec2104f-bcc2-4dd1-a7ab-6896999e4c58';
  if (!fs.existsSync(artifactDir)) {
    fs.mkdirSync(artifactDir, { recursive: true });
  }
  const screenshotPath = path.join(artifactDir, 'context_menu_scroll.png');

  console.log('Iniciando o navegador...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  try {
    console.log('Acessando http://localhost:5176...');
    await page.goto('http://localhost:5176', { waitUntil: 'networkidle', timeout: 15000 });

    console.log('Fazendo login...');
    await page.locator('input[type="email"]').first().fill('aryarajmarketing@gmail.com');
    await page.locator('input[type="password"]').first().fill('123456');
    await page.locator('button[type="submit"], button:has-text("Entrar")').first().click();
    await page.waitForTimeout(3000);

    // Selecionar cliente se não houver um ativo
    const hasActiveClient = await page.locator('text=Sem cliente selecionado').count() === 0;
    if (!hasActiveClient) {
      console.log('Nenhum cliente ativo selecionado. Selecionando o primeiro cliente da lista...');
      await page.locator('button:has-text("Sem cliente selecionado")').first().click();
      await page.waitForTimeout(1000);
      await page.locator('button:has-text(" (ID: ")').first().click();
      await page.waitForTimeout(2000);
    }

    console.log('Navegando para Meus Funis...');
    await page.locator('text=Meus Funis').first().click();
    await page.waitForTimeout(2000);

    // Verificar se há funis na lista para editar, se não, cria um
    const funnelCount = await page.locator('button:has-text("Editar")').count();
    if (funnelCount > 0) {
      console.log('Editando o primeiro funil existente...');
      await page.locator('button:has-text("Editar")').first().click();
    } else {
      console.log('Criando novo funil...');
      await page.locator('button:has-text("Novo Funil")').first().click();
    }
    await page.waitForTimeout(3000);

    console.log('Abrindo o menu de contexto na parte inferior do Flow Builder...');
    const pane = page.locator('.react-flow__pane, .react-flow').first();
    const boundingBox = await pane.boundingBox();
    if (boundingBox) {
      // Clica com o botão direito na parte inferior do painel do ReactFlow
      const x = boundingBox.x + boundingBox.width / 2;
      const y = boundingBox.y + boundingBox.height - 100;
      await page.mouse.click(x, y, { button: 'right' });
      console.log(`Right-clicked at: x=${x}, y=${y}`);
    } else {
      await pane.click({ button: 'right', position: { x: 400, y: 500 } });
    }
    await page.waitForTimeout(2000);

    console.log('Tirando screenshot...');
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log(`Screenshot salvo com sucesso em: ${screenshotPath}`);

  } catch (error) {
    console.error('Erro durante a execução do script:', error);
  } finally {
    await browser.close();
    console.log('Navegador fechado.');
  }
}

run();
