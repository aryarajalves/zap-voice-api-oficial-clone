const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const consoleErrors = [];
  const networkErrors = [];

  page.on('console', msg => {
    const text = msg.text();
    console.log(`[CONSOLE] [${msg.type()}] ${text}`);
    if (msg.type() === 'error' || text.toLowerCase().includes('error') || text.toLowerCase().includes('fail')) {
      consoleErrors.push({ type: msg.type(), text });
    }
  });
  
  page.on('pageerror', err => {
    console.error(`[PAGEERROR] ${err.stack || err.message}`);
    consoleErrors.push({ type: 'pageerror', text: err.stack || err.message });
  });
  
  page.on('requestfailed', req => {
    console.error(`[REQFAILED] ${req.url()} - ${req.failure().errorText}`);
    networkErrors.push({ url: req.url(), status: 'failed', text: req.failure().errorText });
  });
  
  page.on('response', async res => {
    const url = res.url();
    const status = res.status();
    if (status >= 400 || url.includes('leads')) {
      console.log(`[RESPONSE] ${status} ${res.statusText()} - ${url}`);
      let bodyText = '';
      try {
        bodyText = await res.text();
        console.log(`[RESPONSE BODY] ${bodyText.substring(0, 1000)}`);
      } catch (e) {
        bodyText = `Could not read response body: ${e.message}`;
      }
      if (status >= 400) {
        networkErrors.push({ url, status, text: bodyText });
      }
    }
  });

  try {
    console.log('--- Step 1: Login ---');
    await page.goto('http://localhost:5176', { waitUntil: 'networkidle', timeout: 30000 });
    await page.locator('input[type="email"]').first().fill('aryarajmarketing@gmail.com');
    await page.locator('input[type="password"]').first().fill('123456');
    await page.locator('button[type="submit"], button:has-text("Entrar")').first().click();
    await page.waitForTimeout(5000);

    // Select first client if Sem cliente selecionado
    const hasNoClient = await page.locator('button:has-text("Sem cliente selecionado")').count();
    if (hasNoClient > 0) {
      console.log('Selecting client...');
      await page.locator('button:has-text("Sem cliente selecionado")').click();
      await page.waitForTimeout(1000);
      await page.locator('div.max-h-60 button').first().click();
      await page.waitForTimeout(2000);
    }

    console.log('--- Step 2: Settings (WhatsApp tab) ---');
    // Open settings modal
    const configBtn = page.locator('button:has-text("Configurações")');
    if (await configBtn.count() > 0) {
      await configBtn.first().click();
      await page.waitForTimeout(2000);
      
      // Click WhatsApp tab
      const waTab = page.locator('button:has-text("WhatsApp")');
      if (await waTab.count() > 0) {
        await waTab.first().click();
        await page.waitForTimeout(2000);
        console.log('WhatsApp tab loaded.');
        
        // Verify Lembretes de Agendamento
        const hasLembretes = await page.locator(':text("Lembretes de Agendamento")').count();
        console.log(`Lembretes de Agendamento section present count: ${hasLembretes}`);
      } else {
        console.log('WhatsApp tab button not found');
      }

      // Close settings modal using the header close button
      console.log('Closing settings modal...');
      await page.locator('div.px-6.py-4.flex.items-center.justify-between button').click();
      await page.waitForTimeout(2000);
    } else {
      console.log('Configurações button not found');
    }

    console.log('--- Step 3: Agendamentos Page ---');
    // Click on Agendamentos sidebar item
    const sidebarItem = page.locator('aside, .sidebar, nav').locator(':text("Agendamentos")').first();
    if (await sidebarItem.count() > 0) {
      console.log('Clicking sidebar item Agendamentos...');
      await sidebarItem.click();
    } else {
      console.log('Clicking first general text match for Agendamentos...');
      await page.locator(':text("Agendamentos")').first().click();
    }
    
    console.log('Waiting on Agendamentos page for errors/data...');
    await page.waitForTimeout(5000);

    // Take screenshot
    const recordingDir = 'C:\\Users\\aryar\\.gemini\\antigravity\\browser_recordings';
    if (!fs.existsSync(recordingDir)) {
      fs.mkdirSync(recordingDir, { recursive: true });
    }
    const screenshotPath = path.join(recordingDir, 'appointments_page.png');
    console.log(`Saving screenshot to: ${screenshotPath}`);
    await page.screenshot({ path: screenshotPath });
    await page.screenshot({ path: 'appointments_page.png' });

    console.log('--- Summary ---');
    console.log('Console Errors:', JSON.stringify(consoleErrors, null, 2));
    console.log('Network Errors:', JSON.stringify(networkErrors, null, 2));

  } catch (err) {
    console.error('An error occurred:', err);
  } finally {
    await browser.close();
  }
}

run();
