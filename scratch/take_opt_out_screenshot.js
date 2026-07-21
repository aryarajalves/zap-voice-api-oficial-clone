const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function run() {
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
    await page.locator('button[type="submit"]').first().click();
    
    console.log('Aguardando o carregamento da interface...');
    await page.waitForTimeout(6000);
    
    // Navegar para Histórico de Disparos
    console.log('Navegando para Histórico de Disparos...');
    const historyBtn = page.locator('button', { hasText: /^Histórico$/ });
    await historyBtn.first().click();
    await page.waitForTimeout(4000);

    // Clicar em Ver Falhas no primeiro disparo que falhou
    console.log('Abrindo o relatório de falhas...');
    const verFalhasBtn = page.locator('button[title="Ver Falhas"]').first();
    await verFalhasBtn.click();
    await page.waitForTimeout(3000);

    // Clicar no ícone de explicação do erro (!)
    console.log('Clicando no ícone de explicar erro...');
    const explainBtn = page.locator('button[title="Explicar erro"]').first();
    await explainBtn.click();
    await page.waitForTimeout(2000);

    // Tirar print final com a explicação aberta
    console.log('Tirando print da explicação aberta em português...');
    await page.screenshot({ path: 'screenshot_experiment_explained.png' });
    console.log('Sucesso completo!');
  } catch (error) {
    console.error('Ocorreu um erro no teste:', error);
  } finally {
    await browser.close();
  }
}

run();
