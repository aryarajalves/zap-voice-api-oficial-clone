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
    
    console.log('Aguardando o login...');
    await page.waitForTimeout(4000);
    
    // Configurar cliente ativo SST (#11)
    console.log('Configurando activeClientId para 11 (SST)...');
    await page.evaluate(() => { localStorage.setItem('activeClientId', '11'); });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    
    await page.setViewportSize({ width: 1440, height: 900 });

    // Navegar para Atendimento
    console.log('Navegando para a página de Atendimento...');
    await page.locator('button:has-text("Atendimento"), aside button:has-text("Atendimento")').first().click();
    await page.waitForTimeout(4000);

    // Clicar na primeira conversa da lista (Bianca Fernandes - Template confirmacao_pedido)
    console.log('Clicando na primeira conversa da lista...');
    const convoCards = page.locator('div.group\\/convo');
    await convoCards.first().click();
    await page.waitForTimeout(2500);

    // Rolar container de mensagens até o fim para exibir o balão completo com os botões
    console.log('Rolando chat até o final...');
    await page.evaluate(() => {
      const scrollables = document.querySelectorAll('div[class*="overflow-y-auto"]');
      scrollables.forEach(s => s.scrollTop = s.scrollHeight);
    });
    await page.waitForTimeout(1000);

    // Tirar print da conversa com balão de template visível com botões
    const screenshotPath = path.join(dir, 'evidence_template_messages.png');
    await page.screenshot({ path: screenshotPath });
    console.log('Screenshot 1 (Template com botões completos) capturada com sucesso!');

    // Clicar no item com Gustavo Nunes (Template com imagem e botões)
    console.log('Clicando na conversa de Gustavo Nunes...');
    const gustavoCard = page.locator('div.group\\/convo:has-text("Gustavo")').first();
    if (await gustavoCard.count() > 0) {
      await gustavoCard.click();
      await page.waitForTimeout(2500);
      await page.evaluate(() => {
        const scrollables = document.querySelectorAll('div[class*="overflow-y-auto"]');
        scrollables.forEach(s => s.scrollTop = s.scrollHeight);
      });
      await page.waitForTimeout(1000);
      const screenshotHeaderPath = path.join(dir, 'evidence_template_header_image.png');
      await page.screenshot({ path: screenshotHeaderPath });
      console.log('Screenshot 2 (Template com imagem e botões completos) capturada!');
    }

  } catch (error) {
    console.error('Erro ao executar Playwright:', error);
  } finally {
    await browser.close();
  }
}

run();
