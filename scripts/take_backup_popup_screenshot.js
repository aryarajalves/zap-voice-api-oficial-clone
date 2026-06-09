const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Assegurar que o diretório de screenshots existe
  const screenshotsDir = path.join(__dirname, 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  try {
    console.log('1. Navegando para a página de login...');
    await page.goto('http://localhost:5176', { waitUntil: 'networkidle', timeout: 30000 });
    
    console.log('2. Realizando login...');
    await page.locator('input[type="email"]').first().fill('aryarajmarketing@gmail.com');
    await page.locator('input[type="password"]').first().fill('123456');
    await page.locator('button[type="submit"], button:has-text("Entrar")').first().click();
    await page.waitForTimeout(6000); 
    
    console.log('3. Navegando para Backup Banco via Sidebar...');
    await page.locator('button:has-text("Backup Banco")').first().click();
    await page.waitForTimeout(4000);

    console.log('4. Clicando em Fazer Backup Agora...');
    // Clica no botão
    await page.locator('#btn-run-backup-now').first().click();
    
    // Aguarda um instante para o modal aparecer
    await page.waitForTimeout(1000);
    
    console.log('5. Capturando tela com o popup de carregamento ativo...');
    const screenshotPopupPath = path.join(screenshotsDir, 'backup_popup_updating.png');
    await page.screenshot({ path: screenshotPopupPath });
    console.log(`Screenshot do popup de carregamento salvo em: ${screenshotPopupPath}`);
    
    // Aguarda o término do backup (o polling do hook deve levar alguns segundos)
    console.log('6. Aguardando finalização do backup...');
    await page.waitForTimeout(10000); // 10 segundos para finalizar o backup e o polling atualizar a tela
    
    console.log('7. Capturando tela após o fechamento automático do popup...');
    const screenshotFinalPath = path.join(screenshotsDir, 'backup_popup_finished.png');
    await page.screenshot({ path: screenshotFinalPath });
    console.log(`Screenshot pós-backup salvo em: ${screenshotFinalPath}`);
    
  } catch (err) {
    console.error('Erro ao tirar screenshots:', err);
  } finally {
    await browser.close();
  }
}

run();
