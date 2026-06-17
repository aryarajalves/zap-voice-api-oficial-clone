const { chromium } = require('playwright');
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

    // Navegar para Histórico importação de contatos
    console.log('Navegando para a página de Histórico importação de contatos...');
    const importHistoryBtn = page.locator('aside button:has-text("Histórico importação de contatos")').first();
    await importHistoryBtn.click();
    await page.waitForTimeout(4000); // aguarda a página carregar

    // Verificar se há itens no histórico de importação
    const checkboxes = page.locator('input[type="checkbox"]');
    const checkboxCount = await checkboxes.count();
    console.log(`Encontrados ${checkboxCount} checkboxes na página.`);

    if (checkboxCount > 1) {
      // O primeiro checkbox é o de selecionar todos.
      // O segundo checkbox (index 1) é o primeiro item da lista.
      console.log('Selecionando o primeiro item do histórico...');
      await checkboxes.nth(1).click();
      await page.waitForTimeout(1000);

      if (checkboxCount > 2) {
        console.log('Selecionando o segundo item do histórico...');
        await checkboxes.nth(2).click();
      } else {
        console.log('Selecionando "Selecionar todos" para marcar...');
        await checkboxes.first().click();
      }
      await page.waitForTimeout(1500);

      // Clicar no botão 'Excluir Selecionados' que aparece
      console.log('Clicando no botão Excluir Selecionados...');
      const excludeBtn = page.locator('button:has-text("Excluir Selecionados")').first();
      await excludeBtn.click();
      await page.waitForTimeout(2000);

      // Validar se o modal de confirmação abriu
      const modal = page.locator('div.fixed:has-text("Confirmar Exclusão")');
      const isVisible = await modal.isVisible();
      console.log(`Modal de confirmação está visível? ${isVisible}`);

      // Verificar as características do modal (backdrop, container central, botão cancelar)
      const cancelBtn = modal.locator('button:has-text("Cancelar")');
      const cancelVisible = await cancelBtn.isVisible();
      console.log(`Botão Cancelar está visível no modal? ${cancelVisible}`);

      // Tirar screenshot do modal
      const destPath = path.resolve(__dirname, '..', 'screenshot_depois_delete_modal.png');
      console.log(`Tirando screenshot e salvando em: ${destPath}`);
      await page.screenshot({ path: destPath });
      console.log(`Screenshot salva com sucesso em: ${destPath}`);
    } else {
      console.log('Não há históricos de importação suficientes para testar o modal.');
      await page.screenshot({ path: path.resolve(__dirname, '..', 'screenshot_depois_delete_modal.png') });
    }

  } catch (err) {
    console.error('Erro durante a automação visual:', err);
  } finally {
    await browser.close();
  }
}

run();
