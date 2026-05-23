const { chromium } = require('playwright');

async function validateEditToast() {
  const browser = await chromium.launch({ headless: false, slowMo: 150 });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  try {
    console.log('1. Acessando http://localhost:5176...');
    await page.goto('http://localhost:5176', { waitUntil: 'networkidle', timeout: 15000 });

    // Login
    console.log('2. Fazendo login...');
    await page.locator('input[type="email"]').first().fill('aryarajmarketing@gmail.com');
    await page.locator('input[type="password"]').first().fill('123456');
    await page.locator('button[type="submit"], button:has-text("Entrar")').first().click();
    await page.waitForTimeout(3000);

    // Navegar para Integrações Webhook
    console.log('3. Clicando em Integrações Webhook...');
    await page.locator('text=Integrações Webhook').first().click();
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'scripts/screenshots/edit_v2_01_list.png' });
    console.log('Screenshot da lista de integrações');

    // Clicar no botão "Editar" (title="Editar")
    console.log('4. Clicando no botão Editar...');
    const editBtn = page.locator('button[title="Editar"]').first();
    await editBtn.click({ force: true });
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'scripts/screenshots/edit_v2_02_modal.png' });
    console.log('Modal de edição aberto');

    // Verificar que o modal de edição está aberto (título "Editar Integração")
    const modalTitle = await page.locator('text=Editar Integração').count();
    console.log('Modal "Editar Integração" encontrado:', modalTitle);

    // Clicar em "Salvar Alterações" dentro do modal
    console.log('5. Clicando em Salvar Alterações...');
    const saveBtn = page.locator('button').filter({ hasText: 'Salvar Alterações' }).last();
    const saveBtnCount = await saveBtn.count();
    console.log('Botão Salvar Alterações encontrado:', saveBtnCount);

    if (saveBtnCount > 0) {
      // Screenshot antes
      await page.screenshot({ path: 'scripts/screenshots/edit_v2_03_before_save.png' });
      
      // CLICAR!
      await saveBtn.click({ force: true });
      console.log('Botão clicado! Aguardando toast de loading...');

      // Captura rápida para o toast "Salvando alterações..."
      await page.waitForTimeout(100);
      await page.screenshot({ path: 'scripts/screenshots/edit_v2_04_toast_loading_100ms.png' });
      
      await page.waitForTimeout(200);
      await page.screenshot({ path: 'scripts/screenshots/edit_v2_05_toast_loading_300ms.png' });
      
      await page.waitForTimeout(300);
      await page.screenshot({ path: 'scripts/screenshots/edit_v2_06_toast_loading_600ms.png' });
      
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'scripts/screenshots/edit_v2_07_toast_1100ms.png' });
      
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'scripts/screenshots/edit_v2_08_toast_success_2100ms.png' });
      console.log('Screenshot toast sucesso');

      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'scripts/screenshots/edit_v2_09_final.png' });
      
      // Verificar textos de toast
      const toastTexts = await page.locator('.Toastify__toast, [class*="toast"], [role="alert"], [data-testid*="toast"]').allTextContents();
      console.log('Toasts capturados:', toastTexts);
    }

  } catch (error) {
    console.error('Erro:', error.message);
    await page.screenshot({ path: 'scripts/screenshots/edit_v2_error.png' }).catch(() => {});
  } finally {
    await page.waitForTimeout(1000);
    await browser.close();
    console.log('Validação concluída.');
  }
}

validateEditToast();
