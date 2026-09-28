const { chromium } = require('playwright');
const path = require('path');

async function run() {
  const artifactPath = path.resolve('C:\\Users\\aryar\\.gemini\\antigravity\\brain\\539da790-27c7-45a2-9a01-fbd03e2cd5af\\evidencia_dois_tiques_azuis_apenas_quando_lida.png');
  
  console.log('Iniciando Chromium...');
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  try {
    console.log('Navegando para o ZapVoice local...');
    await page.goto('http://localhost:5176', { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    // Login
    console.log('Realizando login...');
    await page.locator('input[type="email"]').first().fill('aryarajmarketing@gmail.com');
    await page.locator('input[type="password"]').first().fill('123456');
    await page.locator('button[type="submit"], button:has-text("Entrar")').first().click();
    
    console.log('Aguardando tela principal...');
    await page.waitForTimeout(5000);
    
    // Selecionar cliente SST se dropdown estiver visível
    console.log('Verificando seleção de cliente...');
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

    // Clicar na conversa do Aryaraj
    console.log('Selecionando conversa de Aryaraj...');
    const convoAryaraj = page.locator('text="Aryaraj"').first();
    if (await convoAryaraj.count() > 0) {
      await convoAryaraj.click();
      await page.waitForTimeout(4000);
    } else {
      const convoCards = page.locator('[data-testid="conversation-card"], div.cursor-pointer');
      if (await convoCards.count() > 0) {
        await convoCards.first().click();
        await page.waitForTimeout(4000);
      }
    }

    // Scroll para baixo
    console.log('Rolando até as últimas mensagens...');
    await page.evaluate(() => {
      const containers = document.querySelectorAll('div.overflow-y-auto');
      containers.forEach(c => { c.scrollTop = c.scrollHeight; });
    });
    await page.waitForTimeout(2000);

    console.log('Capturando evidência visual do Chat...');
    await page.screenshot({ path: artifactPath, fullPage: false });
    console.log(`✅ Screenshot capturado em: ${artifactPath}`);

  } catch (error) {
    console.error('❌ Erro durante automação Playwright:', error);
  } finally {
    await browser.close();
  }
}

run();
