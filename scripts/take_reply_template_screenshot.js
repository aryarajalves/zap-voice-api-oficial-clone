const { chromium } = require('playwright');

async function run() {
  const artifactPath = 'C:\\Users\\aryar\\.gemini\\antigravity\\brain\\cd8b77a3-efbf-4889-8f89-3bbf669a5fb4\\responder_template_chat_depois.png';
  
  console.log('Iniciando Chromium...');
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  const page = await browser.newPage();
  
  try {
    console.log('Navegando para http://localhost:5176...');
    // Aguarda carregar
    await page.goto('http://localhost:5176', { waitUntil: 'load', timeout: 45000 });
    
    // Login
    console.log('Preenchendo login...');
    await page.locator('input[type="email"]').first().fill('aryarajmarketing@gmail.com');
    await page.locator('input[type="password"]').first().fill('123456');
    await page.locator('button[type="submit"], button:has-text("Entrar")').first().click();
    
    console.log('Aguardando autenticação...');
    await page.waitForTimeout(4000);
    
    // Selecionar cliente SST se dropdown presente
    const clientBtn = page.locator('button:has-text("Sales Force Brasil"), button:has-text("Sem cliente selecionado")').first();
    if (await clientBtn.count() > 0) {
      await clientBtn.click();
      await page.waitForTimeout(1000);
      const sstOpt = page.locator('button:has-text("SST")').first();
      if (await sstOpt.count() > 0) {
        await sstOpt.click();
        await page.waitForTimeout(3000);
      }
    }
    
    await page.setViewportSize({ width: 1366, height: 850 });

    // Navegar para Atendimento
    console.log('Navegando para Atendimento...');
    await page.locator('button:has-text("Atendimento"), aside button:has-text("Atendimento")').first().click();
    await page.waitForTimeout(4000);

    // Clicar na conversa
    console.log('Clicando na conversa...');
    const convoTarget = page.locator('div:has-text("Aryaraj")').last();
    await convoTarget.click();
    await page.waitForTimeout(4000);

    // Scroll até o final da conversa
    console.log('Rolando até o final da conversa...');
    await page.evaluate(() => {
      const c = document.querySelector('[data-testid="chat-messages-container"]');
      if (c) c.scrollTop = c.scrollHeight;
    });
    await page.waitForTimeout(1500);

    // Hover sobre o balão do WhatsApp Template
    console.log('Localizando e passando o mouse sobre o balão do template...');
    const templateBadge = page.locator('text=WhatsApp Template').last();
    if (await templateBadge.count() > 0) {
      const bubble = templateBadge.locator('xpath=ancestor::div[contains(@class, "group/msg")]');
      await bubble.hover();
      await page.waitForTimeout(800);

      console.log('Clicando em responder...');
      const replyBtn = bubble.locator('button[title="Responder a esta mensagem"]');
      if (await replyBtn.count() > 0) {
        await replyBtn.click();
      } else {
        await page.locator('button[title="Responder a esta mensagem"]').last().click();
      }
      await page.waitForTimeout(2000);
    } else {
      const bubbles = page.locator('[data-testid="chat-messages-container"] .group\\/msg');
      if (await bubbles.count() > 0) {
        await bubbles.last().hover();
        await page.waitForTimeout(800);
        await page.locator('button[title="Responder a esta mensagem"]').last().click();
        await page.waitForTimeout(2000);
      }
    }

    console.log('Capturando screenshot final...');
    await page.screenshot({ path: artifactPath, fullPage: false });
    console.log(`✅ Evidência salva com sucesso em: ${artifactPath}`);

  } catch (error) {
    console.error('❌ Erro durante captura:', error);
  } finally {
    await browser.close();
  }
}

run();
