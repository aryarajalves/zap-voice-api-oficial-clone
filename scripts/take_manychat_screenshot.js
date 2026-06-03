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
    await page.setViewportSize({ width: 1280, height: 950 });

    // Navegar para Integrações Webhook usando a Sidebar
    console.log('Navegando para Integrações Webhook via Sidebar...');
    await page.locator('aside button:has-text("Integrações Webhook")').click();
    await page.waitForTimeout(4000); // aguarda a página e as requisições carregarem

    // Verificar se existe botão de configurar mapeamentos
    console.log('Verificando integrações...');
    const editBtnCount = await page.locator('button[title="Editar"]').count();
    if (editBtnCount > 0) {
      console.log('Abrindo modal de edição da primeira integração...');
      await page.locator('button[title="Editar"]').first().click();
      await page.waitForTimeout(3000);

      // Garantir que o Gatilho #1 está expandido
      const triggerHeader = page.locator('span:has-text("Gatilho #1")');
      if (await triggerHeader.count() > 0) {
        console.log('Verificando se o Gatilho #1 está expandido...');
        const mcVisible = await page.locator('h5:has-text("Integração ManyChat")').isVisible();
        if (!mcVisible) {
          console.log('Expandindo Gatilho #1...');
          await triggerHeader.click();
          await page.waitForTimeout(2000);
        }
      }
      
      // Habilitar toggle do ManyChat se estiver desabilitado
      const manychatToggle = page.locator('h5:has-text("Integração ManyChat")').locator('xpath=../../..').locator('input[type="checkbox"]');
      const isChecked = await manychatToggle.isChecked();
      if (!isChecked) {
        console.log('Ativando toggle do ManyChat...');
        await page.locator('h5:has-text("Integração ManyChat")').locator('xpath=../../..').locator('label').click();
        await page.waitForTimeout(2000);
      }
      
      // Rolar até a seção do ManyChat para ficar bem visível no print
      console.log('Rolando até a seção do ManyChat...');
      await page.locator('h5:has-text("Integração ManyChat")').scrollIntoViewIfNeeded();
      await page.waitForTimeout(1000);
    } else {
      console.log('Nenhuma integração criada para configurar mapeamentos.');
    }
    
    // Tirar print
    console.log('Tirando print da tela de Integração ManyChat...');
    const screenshotPath = path.join(dir, 'manychat_alternative_tag.png');
    await page.screenshot({ path: screenshotPath });
    console.log(`Print salvo em: ${screenshotPath}`);
    
    // Copiar para local visível
    const brainDir = 'C:\\Users\\aryar\\.gemini\\antigravity\\brain\\18f67207-384f-406b-8a11-75c93431a6c3';
    if (fs.existsSync(brainDir)) {
      const destPath = path.join(brainDir, 'manychat_alternative_tag.png');
      fs.copyFileSync(screenshotPath, destPath);
      console.log(`Print copiado para o cérebro: ${destPath}`);
    }

  } catch (err) {
    console.error('Erro ao tirar screenshot:', err);
    await page.screenshot({ path: path.join(dir, 'manychat_error.png') });
  } finally {
    await browser.close();
  }
}

run();
