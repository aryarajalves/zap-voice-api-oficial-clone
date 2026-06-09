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
    await page.goto('http://localhost:5176');
    await page.waitForSelector('input[type="email"]', { timeout: 30000 });

    
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

    // Navegar para Webhook Integrations
    console.log('Navegando para Webhook Integrations...');
    await page.locator('aside button:has-text("Integrações")').click();
    await page.waitForTimeout(4000);

    // Clicar em "Testar" no primeiro registro da tabela
    console.log('Abrindo modal de teste de webhook...');
    await page.locator('button:has-text("Testar")').first().click();
    await page.waitForTimeout(2000);

    // Tirar print do modal aberto
    console.log('Tirando print do modal de teste...');
    await page.screenshot({ path: 'scripts/screenshots/test_modal_opened.png' });

    // Clicar em "Executar Teste" no modal
    console.log('Executando teste...');
    await page.locator('button:has-text("Executar Teste")').click();
    await page.waitForTimeout(3000); // aguarda requisição

    // Fechar modal de teste se ainda estiver aberto ou após toast
    console.log('Teste disparado. Navegando para Leads...');
    
    // Navegar para Leads (Webhooks Leads)
    await page.locator('aside button:has-text("Leads")').click();
    await page.waitForTimeout(4000);

    // Tirar print da tabela de leads
    console.log('Tirando print da lista de leads...');
    const targetScreenshot = 'scripts/screenshots/leads_list_after_test.png';
    await page.screenshot({ path: targetScreenshot });
    console.log(`Print final salvo em: ${targetScreenshot}`);

  } catch (err) {
    console.error('Erro ao tirar screenshot:', err);
    await page.screenshot({ path: 'scripts/screenshots/error_validation.png' });
  } finally {
    await browser.close();
  }
}

run();
