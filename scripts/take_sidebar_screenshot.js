const { chromium } = require('playwright');

async function run() {
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
    await page.waitForTimeout(5000); // aguardar login e animações
    
    // Verificar se tem cliente selecionado. Se estiver "Sem cliente selecionado", clica no dropdown e seleciona o primeiro
    const hasNoClient = await page.locator('button:has-text("Sem cliente selecionado")').count();
    if (hasNoClient > 0) {
      console.log('Nenhum cliente ativo. Selecionando o primeiro disponível...');
      await page.locator('button:has-text("Sem cliente selecionado")').click();
      await page.waitForTimeout(1000);
      // Clica no primeiro item do dropdown (botão dentro do menu que não seja o de criar)
      await page.locator('div.max-h-60 button').first().click();
      await page.waitForTimeout(2000);
    }
    
    // Definir viewport para pegar a sidebar inteira e com qualidade
    await page.setViewportSize({ width: 1280, height: 800 });
    
    // Tirar print da tela com a sidebar atualizada
    console.log('Tirando screenshot...');
    await page.screenshot({ path: 'scripts/screenshots/sidebar_categorizada.png' });
    console.log('Screenshot tirado com sucesso: scripts/screenshots/sidebar_categorizada.png');
    
  } catch (err) {
    console.error('Erro ao tirar screenshot da sidebar:', err);
  } finally {
    await browser.close();
  }
}

run();
