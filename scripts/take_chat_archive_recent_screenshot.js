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
    
    console.log('Aguardando o carregamento da interface...');
    await page.waitForTimeout(5000);
    
    // Definir viewport
    await page.setViewportSize({ width: 1366, height: 850 });

    // Navegar para Atendimento
    console.log('Navegando para a página de Atendimento...');
    const atendimentoBtn = page.locator('button:has-text("Atendimento"), aside button:has-text("Atendimento")').first();
    if (await atendimentoBtn.count() > 0) {
      await atendimentoBtn.click();
    }
    await page.waitForTimeout(4000);

    // Tirar print 1: Painel de atendimento com dropdown de status aberto
    console.log('Tirando print 1: Painel de Atendimento...');
    await page.screenshot({ path: 'scripts/screenshots/chat_painel_principal.png' });

    // Clicar na aba de filtro "Ordem"
    console.log('Clicando na aba Ordem...');
    const ordemBtn = page.locator('button:has-text("Ordem")').first();
    if (await ordemBtn.count() > 0) {
      await ordemBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'scripts/screenshots/chat_filtro_ordem_recentes.png' });
    }

    // Clicar na primeira conversa para abrir o cabeçalho com o botão Arquivar
    console.log('Abrindo conversa...');
    const firstConvo = page.locator('div.group\\/convo').first();
    if (await firstConvo.count() > 0) {
      await firstConvo.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'scripts/screenshots/chat_conversa_com_botao_arquivar.png' });
    }

    console.log('✅ Validação visual concluída com sucesso!');
  } catch (err) {
    console.error('Erro no script de print:', err);
    await page.screenshot({ path: 'scripts/screenshots/error_chat_validation.png' }).catch(() => {});
  } finally {
    await browser.close();
  }
}

run();
