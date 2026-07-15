const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Setup loggers
  page.on('console', msg => {
    console.log(`[CONSOLE] [${msg.type()}] ${msg.text()}`);
  });
  
  page.on('pageerror', err => {
    console.error(`[PAGEERROR] ${err.stack || err.message}`);
  });
  
  page.on('requestfailed', req => {
    console.error(`[REQFAILED] ${req.url()} - ${req.failure().errorText}`);
  });
  
  page.on('response', async res => {
    const url = res.url();
    const status = res.status();
    if (status >= 400 || url.includes('lead') || url.includes('schedule')) {
      console.log(`[RESPONSE] ${status} ${res.statusText()} - ${url}`);
      try {
        const text = await res.text();
        console.log(`[RESPONSE BODY] ${text.substring(0, 1000)}`);
      } catch (e) {
        console.log(`[RESPONSE BODY ERROR] Could not read response body: ${e.message}`);
      }
    }
  });

  try {
    console.log('Navigating to http://localhost:5176 ...');
    await page.goto('http://localhost:5176', { waitUntil: 'networkidle', timeout: 30000 });
    
    // Login
    console.log('Filling login credentials...');
    await page.locator('input[type="email"]').first().fill('aryarajmarketing@gmail.com');
    await page.locator('input[type="password"]').first().fill('123456');
    await page.locator('button[type="submit"], button:has-text("Entrar")').first().click();
    
    console.log('Waiting after login...');
    await page.waitForTimeout(5000);
    
    // Check client dropdown if active
    const hasNoClient = await page.locator('button:has-text("Sem cliente selecionado")').count();
    if (hasNoClient > 0) {
      console.log('No client active. Selecting the first available one...');
      await page.locator('button:has-text("Sem cliente selecionado")').click();
      await page.waitForTimeout(1000);
      await page.locator('div.max-h-60 button').first().click();
      await page.waitForTimeout(2000);
    }
    
    // Click on "Agendamentos" menu item on the Sidebar
    console.log('Looking for Agendamentos menu item...');
    const agendamentosLink = page.locator(':has-text("Agendamentos")');
    const count = await agendamentosLink.count();
    console.log(`Found ${count} elements matching 'Agendamentos'`);
    
    // Click the specific link/button for Agendamentos
    // Let's try to locate the sidebar element
    const sidebarItem = page.locator('aside, .sidebar, nav').locator(':text("Agendamentos")').first();
    if (await sidebarItem.count() > 0) {
      console.log('Clicking sidebar item...');
      await sidebarItem.click();
    } else {
      console.log('Clicking first general text match for Agendamentos...');
      await page.locator(':text("Agendamentos")').first().click();
    }
    
    console.log('Waiting on Agendamentos page...');
    await page.waitForTimeout(5000);
    
    // Capture screenshot
    const recordingDir = 'C:\\Users\\aryar\\.gemini\\antigravity\\browser_recordings';
    if (!fs.existsSync(recordingDir)) {
      fs.mkdirSync(recordingDir, { recursive: true });
    }
    const screenshotPath = path.join(recordingDir, 'agendamentos.png');
    console.log(`Taking screenshot: ${screenshotPath}`);
    await page.screenshot({ path: screenshotPath });
    
    // Also save in workspace
    const workspaceScreenshot = 'agendamentos.png';
    await page.screenshot({ path: workspaceScreenshot });
    console.log(`Taking screenshot: ${workspaceScreenshot}`);
    
  } catch (err) {
    console.error('An error occurred during automation:', err);
  } finally {
    await browser.close();
  }
}

run();
