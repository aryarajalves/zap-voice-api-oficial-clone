const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function testZeroDelayV2() {
  const screenshotsDir = path.join(__dirname, 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  console.log('Iniciando teste V2...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));

  try {
    console.log('1. Acessando http://localhost:5176...');
    await page.goto('http://localhost:5176', { waitUntil: 'networkidle', timeout: 20000 });

    console.log('2. Fazendo login...');
    await page.locator('input[type="email"]').first().fill('aryarajmarketing@gmail.com');
    await page.locator('input[type="password"]').first().fill('123456');
    await page.locator('button[type="submit"], button:has-text("Entrar")').first().click();
    await page.waitForTimeout(4000);

    console.log('3. Navegando para Integrações Webhook...');
    await page.locator('text=Integrações Webhook').first().click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(screenshotsDir, 'v2_01_list.png') });

    console.log('4. Clicando no botão Editar da primeira integração...');
    const editBtn = page.locator('button[title="Editar"]').first();
    await editBtn.click({ force: true });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(screenshotsDir, 'v2_02_modal_open.png') });

    // Expandir o primeiro gatilho que encontrar
    console.log('5. Localizando e expandindo o gatilho...');
    const triggerHeader = page.locator('text=Gatilho #1').first();
    if (await triggerHeader.isVisible()) {
      console.log('Gatilho #1 encontrado. Clicando para expandir/garantir expandido...');
      await triggerHeader.click({ force: true });
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(screenshotsDir, 'v2_03_trigger_expanded.png') });
    } else {
      console.log('Gatilho #1 não encontrado, tentando por "Compra Aprovada"...');
      const alternateHeader = page.locator('text=Compra Aprovada').first();
      if (await alternateHeader.isVisible()) {
        await alternateHeader.click({ force: true });
        await page.waitForTimeout(2000);
        await page.screenshot({ path: path.join(screenshotsDir, 'v2_03_trigger_expanded.png') });
      } else {
        console.log('Nenhum gatilho encontrado no modal!');
      }
    }

    // Achar o switch de Follow-up
    console.log('6. Buscando o switch de Follow-up...');
    const followupSwitchText = page.locator('text=Disparar Mensagem de Follow-up').first();
    if (await followupSwitchText.isVisible()) {
      console.log('Switch de Follow-up visível no DOM.');
      await followupSwitchText.scrollIntoViewIfNeeded().catch(() => {});
      
      // O container do switch
      const switchContainer = page.locator('div:has-text("Disparar Mensagem de Follow-up (Recorrência de Template)")').first();
      const checkbox = switchContainer.locator('input[type="checkbox"]');
      const isChecked = await checkbox.isChecked().catch(() => false);
      console.log('O checkbox do follow-up está marcado?', isChecked);

      if (!isChecked) {
        console.log('Clicando no switch do Follow-up...');
        // Clicamos no div visual do switch que fica do lado do input checkbox
        await switchContainer.locator('div.w-10').click({ force: true });
        await page.waitForTimeout(2000);
        await page.screenshot({ path: path.join(screenshotsDir, 'v2_04_followup_active.png') });
      }

      // Agora vamos procurar o input de tempo do follow-up.
      console.log('7. Buscando input de tempo de espera...');
      const delayInput = page.locator('input[placeholder="Tempo..."]').first();
      if (await delayInput.isVisible()) {
        const val = await delayInput.inputValue();
        console.log('Valor atual do delay:', val);

        console.log('Limpando delay (deixando vazio)...');
        await delayInput.fill('');
        await page.waitForTimeout(1000);
        await page.screenshot({ path: path.join(screenshotsDir, 'v2_05_delay_filled_zero.png') });

        // Clicar em "Salvar Alterações"
        console.log('8. Clicando em Salvar Alterações...');
        const saveBtn = page.locator('button').filter({ hasText: 'Salvar Alterações' }).last();
        await saveBtn.click({ force: true });
        await page.waitForTimeout(2000);
        
        await page.screenshot({ path: path.join(screenshotsDir, 'v2_06_after_save_click.png') });

        const modalAberto = await page.locator('text=Editar Integração').count() > 0;
        console.log('Modal continua aberto após tentativa de salvar?', modalAberto);

        const toastMsgs = await page.locator('[role="status"], [role="alert"]').allTextContents();
        console.log('Toasts capturados na tela:', toastMsgs);
      } else {
        console.log('Input de delay do follow-up não apareceu mesmo após clicar no switch!');
      }
    } else {
      console.log('Switch do follow-up não está visível no modal.');
    }

  } catch (err) {
    console.error('Erro durante execução do teste:', err.message);
  } finally {
    await browser.close();
    console.log('Fim do teste V2.');
  }
}

testZeroDelayV2();
