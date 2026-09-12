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

    // Selecionar o primeiro checkbox da lista de conversas
    console.log('Selecionando conversa pelo checkbox...');
    const checkboxes = page.locator('input[type="checkbox"]');
    const count = await checkboxes.count();
    console.log(`Checkboxes encontrados: ${count}`);
    if (count > 1) {
      // O primeiro pode ser o do header ou da primeira conversa
      await checkboxes.nth(1).check();
      await page.waitForTimeout(800);
    }

    // 1. Screenshot da barra de seleção com os botões visíveis sem corte
    const bulkBarPath = path.join(dir, 'chat_bulk_actions_fixed.png');
    await page.screenshot({ path: bulkBarPath });
    console.log(`Screenshot da barra de ações salva em: ${bulkBarPath}`);

    // Clicar no botão "Etiquetar"
    console.log('Clicando no botão Etiquetar...');
    const tagBtn = page.locator('button:has-text("Etiquetar")').first();
    await tagBtn.click();
    await page.waitForTimeout(1000);

    // 2. Screenshot do modal aberto com a lista de etiquetas
    const modalPath = path.join(dir, 'chat_bulk_tag_modal_open.png');
    await page.screenshot({ path: modalPath });
    console.log(`Screenshot do modal de etiquetas aberto salvo em: ${modalPath}`);

    // Digitar no campo de busca para filtrar etiquetas
    console.log('Filtrando etiqueta digitando no input de busca...');
    const searchInput = page.locator('#bulk-tag-search-input');
    await searchInput.fill('compra');
    await page.waitForTimeout(600);

    // 3. Screenshot com filtro em tempo real
    const filterPath = path.join(dir, 'chat_bulk_tag_modal_search.png');
    await page.screenshot({ path: filterPath });
    console.log(`Screenshot do filtro em tempo real salvo em: ${filterPath}`);

  } catch (error) {
    console.error('Erro na captura:', error);
  } finally {
    await browser.close();
    console.log('Processo finalizado.');
  }
}

run();
