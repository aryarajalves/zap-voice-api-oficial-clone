const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

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
    await page.waitForTimeout(6000);
    
    // Selecionar cliente SST
    console.log('Selecionando cliente SST...');
    const clientSelector = page.locator('header button, div.relative button:has-text("SST"), button:has-text("Sales Force"), button:has-text("Sem cliente")').first();
    await clientSelector.click();
    await page.waitForTimeout(1000);
    
    const sstOption = page.locator('button:has-text("SST")').first();
    if (await sstOption.count() > 0) {
      await sstOption.click();
      await page.waitForTimeout(3000);
    }
    
    await page.setViewportSize({ width: 1366, height: 900 });

    // Navegar para Contatos via Sidebar
    console.log('Navegando para a aba Contatos...');
    await page.locator('aside button:has-text("Contatos")').first().click();
    await page.waitForTimeout(4000);
    
    // Abrir dropdown de etiquetas
    console.log('Abrindo dropdown de etiquetas...');
    const tagDropdownBtn = page.locator('button:has-text("Etiquetas"), button:has-text("+"), button:has-text("Todas as Etiquetas")').first();
    await tagDropdownBtn.click();
    await page.waitForTimeout(1000);
    
    // Buscar 'aryaraj' no dropdown
    const searchInput = page.locator('input[placeholder*="Buscar etiqueta"]').first();
    await searchInput.fill('aryaraj');
    await page.waitForTimeout(1000);
    
    // Clicar em TER para 'aryaraj'
    // Na linha da tag 'aryaraj', clicar no botao 'TER'
    console.log('Selecionando TER para aryaraj...');
    const aryarajRow = page.locator('div:has-text("aryaraj"):not(:has-text("aryaraj_hokage"))').last();
    const terAryaraj = page.locator('button:has-text("+ TER"), button:has-text("TER")').first();
    await terAryaraj.click();
    await page.waitForTimeout(1000);
    
    // Clicar em NÃO TER para 'aryaraj_hokage'
    console.log('Selecionando NAO TER para aryaraj_hokage...');
    const naoTerHokage = page.locator('button:has-text("- NÃO TER"), button:has-text("NÃO TER")').nth(1);
    await naoTerHokage.click();
    await page.waitForTimeout(2000);

    // Fechar dropdown de etiquetas
    await tagDropdownBtn.click();
    await page.waitForTimeout(2000);
    
    console.log('Capturando print dos contatos filtrados...');
    await page.screenshot({ path: 'scripts/screenshots/tag_filter_underscore_fix.png' });
    console.log('Print salvo: scripts/screenshots/tag_filter_underscore_fix.png');

  } catch (err) {
    console.error('Erro no teste visual:', err);
    await page.screenshot({ path: 'scripts/screenshots/tag_filter_underscore_error.png' });
  } finally {
    await browser.close();
  }
}

run();
