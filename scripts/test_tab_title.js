const { chromium } = require('playwright');

async function run() {
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
    await page.waitForTimeout(5000); // aguardar login
    
    // Selecionar cliente se não houver um ativo
    const hasNoClient = await page.locator('button:has-text("Sem cliente selecionado")').count();
    if (hasNoClient > 0) {
      console.log('Nenhum cliente ativo. Selecionando o primeiro disponível...');
      await page.locator('button:has-text("Sem cliente selecionado")').click();
      await page.waitForTimeout(1000);
      await page.locator('div.max-h-60 button').first().click();
      await page.waitForTimeout(3000);
    }

    // 1. Abrir Modal de Configurações
    console.log('Abrindo modal de Configurações...');
    await page.locator('button:has-text("Configurações")').click();
    await page.waitForTimeout(2000);

    // 2. Mudar o Nome da Empresa para "Zap Teste"
    console.log('Alterando nome da empresa para "Zap Teste"...');
    await page.locator('input[name="APP_NAME"]').fill('Zap Teste');
    await page.waitForTimeout(1000);

    // 3. Salvar as Configurações
    console.log('Clicando em Salvar Configurações...');
    await page.locator('button:has-text("Salvar Configurações")').click();
    await page.waitForTimeout(3000);

    // 4. Verificar se o título mudou para "Zap Teste"
    let currentTitle = await page.title();
    console.log('Título do documento atual:', currentTitle);
    if (currentTitle !== 'Zap Teste') {
      throw new Error(`O título não mudou para Zap Teste! Título atual: ${currentTitle}`);
    }

    // 5. Recarregar a página e medir o título imediatamente após o recarregamento
    console.log('Recarregando a página...');
    await page.reload({ waitUntil: 'commit' });
    
    let immediateTitle = await page.title();
    console.log('Título imediatamente após recarregamento (do localStorage):', immediateTitle);
    if (immediateTitle !== 'Zap Teste') {
      throw new Error(`O título pós-reload imediato falhou! Título: ${immediateTitle}`);
    }
    
    await page.waitForTimeout(5000); // Aguarda carregar tudo completamente
    let finalTitle = await page.title();
    console.log('Título final após carregamento completo:', finalTitle);
    if (finalTitle !== 'Zap Teste') {
      throw new Error(`O título pós-reload final falhou! Título: ${finalTitle}`);
    }

    // Tirar screenshot
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.screenshot({ path: 'scripts/screenshots/whitelabel_title_check.png' });
    console.log('Screenshot gravado em: scripts/screenshots/whitelabel_title_check.png');

    // 6. Restaurar o nome original (ZapVoice) para não quebrar outros testes
    console.log('Restaurando nome da empresa para "ZapVoice"...');
    await page.locator('button:has-text("Configurações")').click();
    await page.waitForTimeout(2000);
    await page.locator('input[name="APP_NAME"]').fill('ZapVoice');
    await page.waitForTimeout(1000);
    await page.locator('button:has-text("Salvar Configurações")').click();
    await page.waitForTimeout(3000);

    console.log('Branding restaurado com sucesso para "ZapVoice"!');

  } catch (err) {
    console.error('Erro no teste de título:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
