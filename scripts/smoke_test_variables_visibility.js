const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function run() {
  const screenshotsDir = path.join(__dirname, 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  console.log('Iniciando teste de visibilidade de variáveis...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));

  try {
    console.log('1. Acessando http://localhost:5176...');
    await page.goto('http://localhost:5176', { waitUntil: 'networkidle', timeout: 20000 });

    // Login
    console.log('2. Preenchendo campos de login...');
    await page.locator('input[type="email"]').first().fill('aryarajmarketing@gmail.com');
    await page.locator('input[type="password"]').first().fill('123456');
    await page.locator('button[type="submit"], button:has-text("Entrar")').first().click();
    await page.waitForTimeout(4000);

    // Navegar para Integrações Webhook
    console.log('3. Navegando para Integrações Webhook...');
    const integrationsMenu = page.locator('text=Integrações Webhook').first();
    await integrationsMenu.click({ timeout: 5000 }).catch(err => {
      console.log('Erro ao clicar em Integrações Webhook:', err.message);
    });
    await page.waitForTimeout(3000);

    // Clicar no botão "Editar" (title="Editar")
    console.log('4. Clicando no botão Editar da primeira integração...');
    const editBtn = page.locator('button[title="Editar"]').first();
    await editBtn.click({ force: true, timeout: 5000 }).catch(err => {
      console.log('Erro ao clicar no botão Editar:', err.message);
    });
    await page.waitForTimeout(3000);

    // Verificar se o modal abriu de fato, senão tenta Nova Integração
    let modalTitleCount = await page.locator('text=Editar Integração').count();
    if (modalTitleCount === 0) {
      console.log('Tentando abrir modal de Nova Integração...');
      await page.locator('text=Nova Integração').first().click({ force: true, timeout: 5000 }).catch(e => {
        console.log('Erro ao clicar em Nova Integração:', e.message);
      });
      await page.waitForTimeout(3000);
    }

    // Expandir gatilhos se fechados
    console.log('5. Verificando se o gatilho está expandido...');
    const templateLabel = page.locator('text=Template ZapVoice').first();
    if (!await templateLabel.isVisible()) {
      console.log('Gatilho fechado. Clicando no header para expandir...');
      const triggerHeader = page.locator('.cursor-pointer:has-text("GATILHO #")').first();
      await triggerHeader.click({ force: true });
      await page.waitForTimeout(2000);
    } else {
      console.log('Gatilho já está expandido.');
    }

    // Rolar até a seção de variáveis
    console.log('6. Rolando até a seção de variáveis...');
    if (await templateLabel.isVisible()) {
      await templateLabel.scrollIntoViewIfNeeded().catch(() => {});
    }

    // Capturar screenshot antes de alterar
    console.log('7. Capturando screenshot da seção de variáveis inicial...');
    await page.screenshot({ path: path.join(screenshotsDir, 'variables_initial.png') });

    // Verificar se a seção de Variáveis Adicionais / Cabeçalho está visível para o template atual
    const additionalVarsTitle = page.locator('text=Variáveis Adicionais / Cabeçalho').first();
    const isVisibleInitial = await additionalVarsTitle.isVisible();
    console.log('Variáveis Adicionais / Cabeçalho visível inicialmente?', isVisibleInitial);

    // Selecionar um template específico (mensagem_teste_03)
    console.log('8. Selecionando template mensagem_teste_03...');
    const selectBox = page.locator('div:has(label:has-text("Template ZapVoice"))').first().locator('.relative > div').first();
    // Clicar sem force para testar a clicabilidade real do Playwright
    await selectBox.click();
    
    // Aguardar o input de busca com waitForSelector inteligente
    console.log('Aguardando input de busca do portal...');
    const searchInputSelector = 'input[placeholder="Digite para buscar..."]';
    await page.waitForSelector(searchInputSelector, { state: 'visible', timeout: 5000 });
    
    const searchInput = page.locator(searchInputSelector).first();
    await searchInput.fill('mensagem_teste_03');
    await page.waitForTimeout(1000);
    
    // Clicar na opção mensagem_teste_03
    const option = page.locator('div').filter({ hasText: /^mensagem_teste_03$/ }).first();
    await option.click({ force: true });
    await page.waitForTimeout(2500);

    // Rolar e tirar screenshot confirmando se sumiu
    console.log('9. Capturando screenshot final após seleção de mensagem_teste_03...');
    const varSection = page.locator('div:has(label:has-text("Template ZapVoice"))').first();
    if (await varSection.isVisible()) {
      await varSection.scrollIntoViewIfNeeded().catch(() => {});
    }
    await page.screenshot({ path: path.join(screenshotsDir, 'variables_final_mensagem_teste_03.png') });

    const isVisibleFinal = await additionalVarsTitle.isVisible();
    console.log('Variáveis Adicionais / Cabeçalho visível após selecionar mensagem_teste_03?', isVisibleFinal);

  } catch (error) {
    console.error('Erro na execução do script:', error);
    // Tirar screenshot de erro para diagnóstico se falhar
    await page.screenshot({ path: path.join(screenshotsDir, 'error_smoke_test.png') });
  } finally {
    await browser.close();
    console.log('Fim do teste.');
  }
}

run();
