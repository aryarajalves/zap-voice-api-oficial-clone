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
    
    console.log('Aguardando login...');
    await page.waitForTimeout(4000);
    
    // Definir cliente 11 (SST) no localStorage para carregar as etiquetas reais
    console.log('Definindo cliente ativo como 11 (SST)...');
    await page.evaluate(() => {
      localStorage.setItem('activeClientId', '11');
    });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(4000);
    
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
    await page.waitForTimeout(1000);

    // Clicar no seletor de Marcador para abrir o dropdown
    console.log('Clicando no seletor de Marcador...');
    const trigger = page.locator('#chat-label-filter-trigger');
    await trigger.click();
    await page.waitForTimeout(1000);

    // 1. Tirar screenshot com o dropdown aberto exibindo as etiquetas reais com cores
    const dropdownOpenPath = path.join(dir, 'chat_marcador_dropdown_aberto.png');
    await page.screenshot({ path: dropdownOpenPath });
    console.log(`Screenshot do dropdown aberto salvo em: ${dropdownOpenPath}`);

    // 2. Digitar no campo de busca para demonstrar filtragem em tempo real
    console.log('Digitando "compra" no campo de pesquisa de etiquetas...');
    const searchInput = page.locator('#chat-label-search-input');
    await searchInput.fill('compra');
    await page.waitForTimeout(1000);

    const depoisPath = path.join(dir, 'chat_marcador_filter_depois.png');
    await page.screenshot({ path: depoisPath });
    console.log(`Screenshot 'Depois' filtrando salvo em: ${depoisPath}`);

    // 3. Clicar na etiqueta filtrada para demonstrar o filtro ativo com badge e botão de limpar
    console.log('Clicando na etiqueta "compra-aprovada"...');
    const tagOption = page.locator('#chat-label-filter-dropdown-menu button:has-text("compra-aprovada")').first();
    if (await tagOption.count() > 0) {
      await tagOption.click();
      await page.waitForTimeout(1500);
      const ativoPath = path.join(dir, 'chat_marcador_filtro_ativo.png');
      await page.screenshot({ path: ativoPath });
      console.log(`Screenshot com filtro ativo salvo em: ${ativoPath}`);
    }

  } catch (error) {
    console.error('Erro durante captura de tela:', error);
  } finally {
    await browser.close();
  }
}

run();
