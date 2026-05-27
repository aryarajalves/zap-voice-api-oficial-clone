const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function run() {
  const targetDir = 'C:\\Users\\aryar\\.gemini\\antigravity\\brain\\8595463f-9886-4431-91b9-8d8407519f31';
  if (!fs.existsSync(targetDir)){
    fs.mkdirSync(targetDir, { recursive: true });
  }
  const screenshotPath = path.join(targetDir, 'validacao_sincronizacao_labels.png');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.error('PAGE ERROR:', err.message));
  
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

    // Navegar para Integrações Webhook usando a Sidebar
    console.log('Navegando para Integrações Webhook via Sidebar...');
    await page.locator('aside button:has-text("Integrações Webhook")').click();
    await page.waitForTimeout(4000); // aguarda a página e as requisições carregarem
    
    // Verificar se existe alguma integração listada na tabela. Se não, criar uma de teste.
    const integrationRows = await page.locator('tbody tr').count();
    console.log(`Linhas de integração encontradas na tabela: ${integrationRows}`);
    if (integrationRows === 0) {
      console.log('Nenhuma integração encontrada. Criando uma nova...');
      await page.locator('button:has-text("Nova Integração")').click();
      await page.waitForTimeout(2000);
      await page.locator('input[placeholder*="Nome"], input[name="name"]').first().fill('Integração de Teste Automatizado');
      // Selecionar plataforma se houver select
      const selectPlat = await page.locator('select').first();
      if (await selectPlat.count() > 0) {
        await selectPlat.selectOption({ index: 1 });
      }
      await page.locator('button:has-text("Salvar"), button:has-text("Criar")').first().click();
      await page.waitForTimeout(4000);
    }

    // Executar teste para popular o histórico
    console.log('Simulando envio de webhook de teste para popular o histórico...');
    const testButton = page.locator('tbody tr button:has-text("Testar")').first();
    if (await testButton.count() > 0) {
      await testButton.click();
      await page.waitForTimeout(2000);
      await page.locator('button:has-text("Executar Teste")').first().click();
      await page.waitForTimeout(4000);
      console.log('Webhook de teste enviado!');
    }

    // Clicar em "Histórico" no primeiro registro da tabela
    console.log('Abrindo modal de Histórico da integração...');
    const historicoButton = page.locator('tbody tr button:has-text("Histórico")').first();
    if (await historicoButton.count() > 0) {
      await historicoButton.click();
      await page.waitForTimeout(3000); // aguarda modal carregar
      
      // Procurar botões de sincronizar
      const syncAllCount = await page.locator('button:has-text("SINCRONIZAR TUDO")').count();
      const syncSingleCount = await page.locator('button:has-text("Sincronizar Dados")').count();
      console.log(`Botões encontrados no Histórico: SINCRONIZAR TUDO (${syncAllCount}), Sincronizar Dados (${syncSingleCount})`);
      
      if (syncSingleCount > 0) {
        console.log('Clicando em Sincronizar Dados no primeiro item...');
        await page.locator('button:has-text("Sincronizar Dados")').first().click();
        await page.waitForTimeout(4000); // aguarda reprocessamento
      } else if (syncAllCount > 0) {
        console.log('Clicando em SINCRONIZAR TUDO...');
        await page.locator('button:has-text("SINCRONIZAR TUDO")').click();
        await page.waitForTimeout(5000); // aguarda reprocessamento completo
      } else {
        console.log('Nenhum botão de sincronizar encontrado ou nenhum histórico disponível no modal.');
      }
      
      // Fechar modal de histórico
      console.log('Fechando painel de histórico...');
      await page.locator('button:has-text("Fechar Painel")').click();
      await page.waitForTimeout(2000);
    } else {
      console.log('Nenhuma integração configurada encontrada para abrir histórico.');
    }
    
    // Navegar para Contatos via Sidebar
    console.log('Navegando para a aba Contatos...');
    await page.locator('aside button:has-text("Contatos")').first().click();
    await page.waitForTimeout(4000);
    
    // Tirar print da lista de contatos atualizada contendo os detalhes e a etiqueta visível
    console.log('Tirando print final da lista de contatos...');
    await page.screenshot({ path: screenshotPath });
    console.log('Print salvo com sucesso em:', screenshotPath);
    
  } catch (err) {
    console.error('Erro ao executar automação:', err);
  } finally {
    await browser.close();
  }
}

run();

