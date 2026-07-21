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

    // Navegar para Atendimento
    console.log('Navegando para a página de Atendimento...');
    await page.locator('button:has-text("Atendimento"), aside button:has-text("Atendimento")').first().click();
    await page.waitForTimeout(4000); // aguarda a página carregar

    // Tirar print 1: Painel de Atendimento inicial
    console.log('Tirando print do Painel de Atendimento...');
    await page.screenshot({ path: 'scripts/screenshots/1_chat_atendimento_inicial.png' });

    // Clicar na aba de filtro "Status" para abrir as opções de filtros extras
    console.log('Abrindo filtros de Status...');
    await page.locator('button:has-text("Status")').first().click();
    await page.waitForTimeout(1000);

    // Tirar print 2: Mostrar o filtro extra aberto com o novo botão "Com anotações"
    console.log('Tirando print com botão "Com anotações" visível...');
    await page.screenshot({ path: 'scripts/screenshots/2_chat_filtro_status_aberto.png' });

    // Clicar no checkbox "Selecionar todas" na Página 1
    console.log('Clicando no checkbox "Selecionar todas" na Página 1...');
    await page.locator('input[type="checkbox"] + span:has-text("Selecionar todas"), button:has-text("Selecionar todas")').first().click();
    await page.waitForTimeout(1000);

    // Tirar print 3: Mostrar que os 20 itens da página 1 foram selecionados
    console.log('Tirando print com 20 selecionados da página 1...');
    await page.screenshot({ path: 'scripts/screenshots/3_chat_banner_selecao_pagina.png' });

    // Clicar no link de seleção global dentro do banner (Selecionar todos os X contatos)
    console.log('Clicando em Selecionar todos os contatos...');
    await page.locator('button:has-text("Selecionar todos os")').first().click();
    await page.waitForTimeout(1000);

    // Tirar print 4: Mostrar o banner modificado com "Deselecionar todos os X contatos"
    console.log('Tirando print da selecao global e botao Deselecionar...');
    await page.screenshot({ path: 'scripts/screenshots/4_chat_banner_deselecionar.png' });

    // Avançar para a Página 2 com a seleção global ativa
    console.log('Avançando para a Página 2 com seleção global ativa...');
    await page.locator('div.flex.items-center.gap-2 button').last().click();
    await page.waitForTimeout(2000);

    // Tirar print 5: Mostrar a Página 2 com os contatos visualmente selecionados e a contagem global em 600+
    console.log('Tirando print da Página 2 com contatos selecionados globalmente...');
    await page.screenshot({ path: 'scripts/screenshots/5_chat_pagina_2_global_selecionada.png' });

    // Clicar em "Deselecionar todos os X contatos" na Página 2
    console.log('Clicando em Deselecionar todos os contatos na Página 2...');
    await page.locator('button:has-text("Deselecionar todos os")').first().click();
    await page.waitForTimeout(1500);

    // Tirar print 6: Mostrar a lista totalmente limpa de selecoes na Página 2
    console.log('Tirando print da lista limpa pós deselecao global na Página 2...');
    await page.screenshot({ path: 'scripts/screenshots/6_chat_lista_limpa.png' });

    // Fazer uma seleção acumulada rápida para abrir o modal
    console.log('Selecionando todas na Página 2...');
    await page.locator('input[type="checkbox"] + span:has-text("Selecionar todas"), button:has-text("Selecionar todas")').first().click();
    await page.waitForTimeout(1000);

    // Clicar no botão "Deletar (X)" da barra de lote
    console.log('Clicando no botão de deletar em lote para abrir modal...');
    await page.locator('button:has-text("Deletar (")').first().click();
    await page.waitForTimeout(1000);

    // Tirar print 7: Mostrar o modal de confirmação
    console.log('Tirando print do modal de confirmação de exclusão...');
    await page.screenshot({ path: 'scripts/screenshots/7_chat_modal_confirmacao_deletar_acumulado.png' });

    // Clicar em Cancelar para deixar contatos disponíveis para o usuário
    console.log('Cancelando exclusão para deixar contatos disponíveis para teste do usuário...');
    await page.locator('button:has-text("Cancelar")').first().click();
    await page.waitForTimeout(1000);

    console.log('Automação visual de Atendimento concluída com sucesso!');
    
  } catch (err) {
    console.error('Erro durante o teste visual de Atendimento:', err);
    await page.screenshot({ path: 'scripts/screenshots/chat_error.png' }).catch(() => {});
  } finally {
    browser.close();
  }
}

run();
