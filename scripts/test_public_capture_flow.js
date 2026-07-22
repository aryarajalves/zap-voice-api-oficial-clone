const { chromium } = require('playwright');

async function run() {
  const adminScreenshotPath = 'C:/Users/aryar/.gemini/antigravity/brain/330aac20-d3b6-42ba-8dfe-69131e763c2f/capture_page_admin_screenshot.png';
  const publicCapturePath = 'C:/Users/aryar/.gemini/antigravity/brain/330aac20-d3b6-42ba-8dfe-69131e763c2f/public_capture_page_screenshot.png';
  const thankYouPath = 'C:/Users/aryar/.gemini/antigravity/brain/330aac20-d3b6-42ba-8dfe-69131e763c2f/thank_you_page_screenshot.png';

  console.log('Iniciando Chromium...');
  const browser = await chromium.launch({ headless: true });

  // ---- PARTE 1: Admin Screenshot ----
  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  await adminPage.setViewportSize({ width: 1280, height: 900 });

  try {
    console.log('1. Login no admin...');
    await adminPage.goto('http://localhost:5176', { waitUntil: 'networkidle', timeout: 30000 });
    await adminPage.locator('input[type="email"]').first().fill('aryarajmarketing@gmail.com');
    await adminPage.locator('input[type="password"]').first().fill('123456');
    await adminPage.locator('button[type="submit"], button:has-text("Entrar")').first().click();
    await adminPage.waitForTimeout(4000);

    const hasNoClient = await adminPage.locator('button:has-text("Sem cliente selecionado")').count();
    if (hasNoClient > 0) {
      await adminPage.locator('button:has-text("Sem cliente selecionado")').click();
      await adminPage.waitForTimeout(1000);
      await adminPage.locator('div.max-h-60 button').first().click();
      await adminPage.waitForTimeout(2000);
    }

    console.log('2. Clicando em Página de Captura na Sidebar...');
    await adminPage.locator('button:has-text("Página de Captura")').first().click();
    await adminPage.waitForTimeout(3000);
    await adminPage.screenshot({ path: adminScreenshotPath, fullPage: false });
    console.log('Admin screenshot OK!');
  } catch (err) {
    console.error('Erro no admin:', err.message);
  }

  // ---- PARTE 2: Página Pública - CARREGAR JÁ COM O HASH ----
  const publicContext = await browser.newContext();
  const publicPage = await publicContext.newPage();
  await publicPage.setViewportSize({ width: 1280, height: 900 });

  try {
    console.log('3. Carregando Página Pública diretamente com hash...');
    // Navegação direta com o hash completo na URL
    await publicPage.goto('http://localhost:5176/#/p/masterclass', { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    // Aguardar React inicializar e fazer a chamada de API
    await publicPage.waitForTimeout(8000);
    
    // Log do hash atual
    const hash = await publicPage.evaluate(() => window.location.hash);
    console.log(`  → Hash atual: ${hash}`);
    
    // Tentar localizar o campo de email
    const emailCount = await publicPage.locator('input[type="email"]').count();
    console.log(`  → Campo email visível: ${emailCount > 0}`);
    
    await publicPage.screenshot({ path: publicCapturePath, fullPage: false });
    console.log('Página pública screenshot OK!');

    if (emailCount > 0) {
      console.log('4. Preenchendo e-mail e enviando...');
      await publicPage.locator('input[type="email"]').fill('visitante@exemplo.com');
      await publicPage.locator('button[type="submit"]').click();
      await publicPage.waitForTimeout(5000);
      await publicPage.screenshot({ path: thankYouPath, fullPage: false });
      console.log('SUCCESS: Página de Obrigado capturada!');
    } else {
      // Debug: mostrar o que a página está exibindo
      const bodyText = await publicPage.locator('body').innerText().catch(() => '');
      console.log('Conteúdo visível (200 chars):', bodyText.substring(0, 200));
    }
  } catch (err) {
    console.error('Erro na página pública:', err.message);
  } finally {
    await browser.close();
  }
}

run();
