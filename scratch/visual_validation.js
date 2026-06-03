const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const outputDir = 'C:\\Users\\aryar\\.gemini\\antigravity\\brain\\1c70af22-265f-4550-a9c7-11019d0ba065';
  fs.mkdirSync(outputDir, { recursive: true });

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
    
    // Selecionar primeiro cliente ativo se necessário
    const hasNoClient = await page.locator('button:has-text("Sem cliente selecionado")').count();
    if (hasNoClient > 0) {
      console.log('Nenhum cliente ativo. Selecionando o primeiro disponível...');
      await page.locator('button:has-text("Sem cliente selecionado")').click();
      await page.waitForTimeout(1000);
      await page.locator('div.max-h-60 button').first().click();
      await page.waitForTimeout(2000);
    } else {
      // Se já houver um cliente ou um seletor de cliente visível, podemos clicar nele e selecionar o primeiro
      console.log('Verificando seletor de cliente...');
      const clientDropdown = page.locator('button:has-text("Cliente:")');
      if (await clientDropdown.count() > 0) {
        await clientDropdown.click();
        await page.waitForTimeout(1000);
        await page.locator('div.max-h-60 button').first().click();
        await page.waitForTimeout(2000);
      }
    }
    
    // Definir viewport
    await page.setViewportSize({ width: 1280, height: 800 });
    
    // Tirar print da sidebar com o item Backup Banco visível
    console.log('Tirando screenshot da sidebar...');
    const sidebarPath = path.join(outputDir, 'sidebar_backup.png');
    await page.screenshot({ path: sidebarPath });
    console.log('Screenshot da sidebar salvo em:', sidebarPath);
    
    // Clicar no menu Backup Banco
    console.log('Clicando no menu Backup Banco...');
    await page.locator('button:has-text("Backup Banco")').first().click();
    await page.waitForTimeout(3000); // aguardar página carregar
    
    // Tirar print da página de Backup Banco
    console.log('Tirando screenshot da página de backup...');
    const pagePath = path.join(outputDir, 'pagina_backup.png');
    await page.screenshot({ path: pagePath });
    console.log('Screenshot da página de backup salvo em:', pagePath);
    
  } catch (err) {
    console.error('Erro durante o fluxo:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
