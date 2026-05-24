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
    
    // Clicar em "Ver Enviados" no primeiro disparo
    console.log('Abrindo modal de contatos (Enviados)...');
    await page.locator('button[title="Ver Enviados"]').first().click();
    await page.waitForTimeout(3000); // aguarda modal carregar
    
    // Tirar print antes da seleção
    console.log('Tirando print antes da seleção...');
    await page.screenshot({ path: 'scripts/screenshots/contacts_modal_initial.png' });
    console.log('Print salvo: scripts/screenshots/contacts_modal_initial.png');
    
    // Selecionar todos os contatos no modal
    console.log('Selecionando todos os contatos...');
    const checkboxes = page.locator('input[type="checkbox"]');
    await checkboxes.first().click();
    await page.waitForTimeout(1000);
    
    // Tirar print com contatos selecionados
    console.log('Tirando print com contatos selecionados...');
    await page.screenshot({ path: 'scripts/screenshots/contacts_selected.png' });
    console.log('Print salvo: scripts/screenshots/contacts_selected.png');
    
    // Clicar no botão "Etiquetar" que deve estar visível
    console.log('Clicando em Etiquetar...');
    await page.locator('button:has-text("Etiquetar")').click();
    await page.waitForTimeout(2000); // aguarda o modal de etiquetas abrir
    
    // Tirar print do modal de etiquetas aberto
    console.log('Tirando print do modal de etiquetas...');
    await page.screenshot({ path: 'scripts/screenshots/tag_modal_open.png' });
    console.log('Print salvo: scripts/screenshots/tag_modal_open.png');
    
    // Digitar tag
    console.log('Digitando/Selecionando tag...');
    await page.locator('div:has-text("Digite ou selecione uma etiqueta...")').last().click();
    await page.waitForTimeout(1000);
    
    await page.locator('input[placeholder="Filtrar etiquetas..."]').fill('Tag-Automacao');
    await page.waitForTimeout(1000);
    
    await page.locator('button', { hasText: 'Usar "Tag-Automacao"' }).click();
    await page.waitForTimeout(1000);
    
    // Tirar print da tag preenchida
    console.log('Tirando print com a tag preenchida...');
    await page.screenshot({ path: 'scripts/screenshots/tag_filled.png' });
    console.log('Print salvo: scripts/screenshots/tag_filled.png');
    
    // Clicar em Salvar no modal de etiquetas
    console.log('Salvando etiquetas...');
    await page.locator('button:has-text("Salvar")').click();
    await page.waitForTimeout(3000); // aguarda requisição terminar
    
    // Clicar em Fechar no modal de contatos
    console.log('Fechando modal de contatos...');
    await page.locator('button:has-text("Fechar")').click();
    await page.waitForTimeout(1000);
    
    // Navegar para Contatos via Sidebar
    console.log('Navegando para a aba Contatos...');
    await page.locator('aside button:has-text("Contatos")').click();
    await page.waitForTimeout(4000);
    
    // Tirar print da lista de contatos atualizada
    console.log('Tirando print da lista de contatos...');
    await page.screenshot({ path: 'scripts/screenshots/contacts_list_updated.png' });
    console.log('Print salvo: scripts/screenshots/contacts_list_updated.png');
    
  } catch (err) {
    console.error('Erro ao tirar screenshot:', err);
    await page.screenshot({ path: 'scripts/screenshots/error.png' });
  } finally {
    await browser.close();
  }
}

run();
