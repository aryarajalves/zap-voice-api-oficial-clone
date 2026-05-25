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
    
    console.log('Aguardando o carregamento da interface...');
    await page.waitForTimeout(6000); // aguardar login e animações
    
    // Selecionar cliente se não houver cliente ativo
    const hasNoClient = await page.locator('button:has-text("Sem cliente selecionado")').count();
    if (hasNoClient > 0) {
      console.log('Nenhum cliente ativo. Selecionando o primeiro disponível...');
      await page.locator('button:has-text("Sem cliente selecionado")').click();
      await page.waitForTimeout(1000);
      await page.locator('div.max-h-60 button').first().click();
      await page.waitForTimeout(4000);
    }
    
    // Definir viewport
    await page.setViewportSize({ width: 1280, height: 900 });

    // Navegar para Integrações
    console.log('Navegando para a página de Integrações...');
    await page.locator('aside button:has-text("Integrações")').click();
    await page.waitForTimeout(4000); // aguarda a página carregar

    // Tirar print da tabela de integrações
    console.log('Tirando print das Integrações...');
    await page.screenshot({ path: 'scripts/screenshots/integrations_page.png' });

    // Encontrar e clicar no botão "Disparos" especificamente dentro da tabela de integrações
    console.log('Abrindo modal de Disparos de uma integração na tabela...');
    const dispatchesBtn = page.locator('table button:has-text("Disparos")').first();
    await dispatchesBtn.click();
    await page.waitForTimeout(4000); // aguarda a fila de disparos carregar

    // Tirar print da fila de disparos (Antes da exclusão)
    console.log('Tirando print da fila de disparos antes da exclusão...');
    await page.screenshot({ path: 'scripts/screenshots/dispatches_before_delete.png' });

    // Verificar se há linhas na tabela de disparos
    // O modal de disparos possui uma tabela com id ou seletor próprio
    // No DispatchHistoryModal, a tabela de disparos é a única visível no modal
    const checkboxes = page.locator('div.fixed table tbody input[type="checkbox"]');
    const count = await checkboxes.count();
    console.log(`Encontrados ${count} disparos disponíveis para seleção no modal.`);

    if (count > 0) {
      // Clicar no checkbox do cabeçalho da tabela do modal para selecionar todos
      console.log('Selecionando todos os disparos...');
      await page.locator('div.fixed table thead input[type="checkbox"]').first().click();
      await page.waitForTimeout(1000);

      // Tirar print com os itens selecionados e a barra de ações em lote visível
      await page.screenshot({ path: 'scripts/screenshots/dispatches_selected.png' });

      // Clicar no botão Excluir da barra de ações em lote
      console.log('Clicando no botão de excluir em lote...');
      await page.locator('div.fixed button:has-text("Excluir")').first().click();
      await page.waitForTimeout(1000);

      // Tirar print do modal de confirmação aberto (Durante)
      console.log('Tirando print do modal de confirmação de exclusão...');
      await page.screenshot({ path: 'scripts/screenshots/dispatches_delete_modal_confirm.png' });

      // Clicar em CONFIRMAR no modal de confirmação (que é o ConfirmModal mais recente no topo)
      console.log('Confirmando a exclusão dos disparos...');
      const confirmBtn = page.locator('div.fixed button:has-text("Confirmar")').first();
      await confirmBtn.click();
      await page.waitForTimeout(4000); // Aguarda o processamento e atualização

      // Tirar print após exclusão (Depois)
      console.log('Tirando print da fila após a deleção...');
      await page.screenshot({ path: 'scripts/screenshots/dispatches_after_delete.png' });
      console.log('Validação de exclusão em lote de disparos finalizada com sucesso!');
    } else {
      console.log('Nenhum disparo para testar a exclusão.');
    }

  } catch (err) {
    console.error('Erro durante o teste visual de exclusão em massa:', err);
    await page.screenshot({ path: 'scripts/screenshots/dispatches_delete_error.png' });
  } finally {
    await browser.close();
  }
}

run();
