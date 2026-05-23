const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function testZeroDelay() {
  const screenshotsDir = path.join(__dirname, 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  console.log('Iniciando teste...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  // Log de erros do console
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));

  try {
    console.log('1. Acessando http://localhost:5176...');
    await page.goto('http://localhost:5176', { waitUntil: 'networkidle', timeout: 20000 });
    await page.screenshot({ path: path.join(screenshotsDir, '01_page_loaded.png') });

    // Login
    console.log('2. Preenchendo campos de login...');
    await page.locator('input[type="email"]').first().fill('aryarajmarketing@gmail.com');
    await page.locator('input[type="password"]').first().fill('123456');
    await page.screenshot({ path: path.join(screenshotsDir, '02_login_filled.png') });

    console.log('3. Clicando no botão de login...');
    await page.locator('button[type="submit"], button:has-text("Entrar")').first().click();
    await page.waitForTimeout(4000);
    await page.screenshot({ path: path.join(screenshotsDir, '03_after_login.png') });

    // Navegar para Integrações Webhook
    console.log('4. Clicando em Integrações Webhook...');
    const integrationsMenu = page.locator('text=Integrações Webhook').first();
    await integrationsMenu.click({ timeout: 5000 }).catch(err => {
      console.log('Aviso: erro ao clicar em Integrações Webhook pelo texto:', err.message);
    });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(screenshotsDir, '04_integrations_page.png') });

    // Clicar no botão "Editar" (title="Editar")
    console.log('5. Clicando no botão Editar da primeira integração...');
    const editBtn = page.locator('button[title="Editar"]').first();
    await editBtn.click({ force: true, timeout: 5000 }).catch(err => {
      console.log('Aviso: erro ao clicar no botão Editar:', err.message);
    });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(screenshotsDir, '05_modal_open.png') });

    // Verificar se o modal abriu de fato
    const modalTitleCount = await page.locator('text=Editar Integração').count();
    console.log('Modal "Editar Integração" está visível?', modalTitleCount > 0);

    // Se o modal não abriu, vamos tentar clicar no botão de "Nova Integração" para testar no modal de criação
    if (modalTitleCount === 0) {
      console.log('Tentando abrir modal de Nova Integração...');
      await page.locator('text=Nova Integração').first().click({ force: true, timeout: 5000 }).catch(e => {
        console.log('Erro ao clicar em Nova Integração:', e.message);
      });
      await page.waitForTimeout(3000);
      await page.screenshot({ path: path.join(screenshotsDir, '05_new_modal_open.png') });
    }

    // Expandir gatilhos
    console.log('6. Expandindo gatilho se houver...');
    const compraAprovadaHeader = page.locator('text=compra_aprovada').first();
    if (await compraAprovadaHeader.isVisible()) {
      await compraAprovadaHeader.click({ force: true }).catch(() => {});
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(screenshotsDir, '06_trigger_expanded.png') });
    } else {
      console.log('Nenhum gatilho compra_aprovada visível.');
      // Se for modal de Nova Integração, vamos adicionar um gatilho
      const novoGatilhoBtn = page.locator('text=Novo Gatilho').first();
      if (await novoGatilhoBtn.isVisible()) {
        await novoGatilhoBtn.click({ force: true });
        await page.waitForTimeout(1500);
        await page.screenshot({ path: path.join(screenshotsDir, '06_new_trigger_added.png') });
      }
    }

    // Rolar até o switch do follow-up
    console.log('7. Verificando switch do follow-up...');
    const followupSwitchLabel = page.locator('text=Disparar Mensagem de Follow-up').first();
    if (await followupSwitchLabel.isVisible()) {
      await followupSwitchLabel.scrollIntoViewIfNeeded().catch(() => {});
      
      // Obter checkbox correspondente
      const checkbox = page.locator('input[type="checkbox"]').last();
      const isChecked = await checkbox.isChecked().catch(() => false);
      console.log('Switch de Follow-up está marcado inicialmente?', isChecked);

      if (!isChecked) {
        console.log('Marcando o switch de Follow-up...');
        await followupSwitchLabel.click({ force: true });
        await page.waitForTimeout(1500);
        await page.screenshot({ path: path.join(screenshotsDir, '07_followup_enabled.png') });
      }
    } else {
      console.log('Switch de Follow-up NÃO encontrado!');
    }

    // Localizar o input de tempo e alterar para 0
    console.log('8. Ajustando tempo de espera para 0...');
    const delayInput = page.locator('input[placeholder="Tempo..."]').first();
    if (await delayInput.isVisible()) {
      await delayInput.fill('0');
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(screenshotsDir, '08_delay_zero.png') });
    } else {
      console.log('Input de tempo de espera NÃO encontrado!');
    }

    // Clicar em "Salvar Alterações"
    console.log('9. Clicando em Salvar Alterações...');
    const saveBtn = page.locator('button').filter({ hasText: 'Salvar Alterações' }).last();
    if (await saveBtn.isVisible()) {
      await saveBtn.click({ force: true });
      await page.waitForTimeout(3000);
      await page.screenshot({ path: path.join(screenshotsDir, '09_after_save_click.png') });
    } else {
      console.log('Botão Salvar Alterações NÃO encontrado!');
    }

    // Verificar se o modal ainda está aberto e capturar toasts
    const modalAberto = await page.locator('text=Editar Integração, text=Nova Integração').count() > 0;
    console.log('Modal continua aberto?', modalAberto);

    const toastMsgs = await page.locator('[role="status"], [role="alert"]').allTextContents();
    console.log('Toasts na tela:', toastMsgs);

  } catch (error) {
    console.error('Erro na execução do script:', error);
  } finally {
    await browser.close();
    console.log('Fim do teste.');
  }
}

testZeroDelay();
