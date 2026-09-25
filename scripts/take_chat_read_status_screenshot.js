const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function run() {
  const artifactPath = 'C:\\Users\\aryar\\.gemini\\antigravity\\brain\\cd8b77a3-efbf-4889-8f89-3bbf669a5fb4\\confirmacao_leitura_chat_depois.png';
  
  console.log('Iniciando o navegador Chromium...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    console.log('Navegando para o frontend do ZapVoice...');
    await page.goto('http://127.0.0.1:5176', { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    // Login
    console.log('Preenchendo credenciais de login...');
    await page.locator('input[type="email"]').first().fill('aryarajmarketing@gmail.com');
    await page.locator('input[type="password"]').first().fill('123456');
    await page.locator('button[type="submit"], button:has-text("Entrar")').first().click();
    
    console.log('Aguardando autenticação...');
    await page.waitForTimeout(5000);
    
    // Selecionar cliente SST (client_id 11)
    console.log('Selecionando cliente SST...');
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
    console.log('Navegando para a página de Atendimento...');
    await page.locator('button:has-text("Atendimento"), aside button:has-text("Atendimento")').first().click();
    await page.waitForTimeout(4000);

    // Clicar na conversa do Aryaraj
    console.log('Clicando na conversa Aryaraj (teste de envio)...');
    const convoTarget = page.locator('div:has-text("teste de envio")').last();
    if (await convoTarget.count() > 0) {
      await convoTarget.click();
      await page.waitForTimeout(4000);

      // Scroll até o final da conversa
      console.log('Rolando até o final da conversa...');
      await page.evaluate(() => {
        const containers = document.querySelectorAll('div.overflow-y-auto');
        containers.forEach(c => { c.scrollTop = c.scrollHeight; });
      });
      await page.waitForTimeout(2000);
    }

    console.log('Capturando evidência visual do Chat...');
    await page.screenshot({ path: artifactPath, fullPage: false });
    console.log(`✅ Screenshot salvo com sucesso em: ${artifactPath}`);

  } catch (error) {
    console.error('❌ Erro durante captura de screenshot:', error);
  } finally {
    await browser.close();
  }
}

run();
