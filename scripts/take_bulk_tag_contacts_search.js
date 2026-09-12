const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function run() {
  const dir = path.join(__dirname, 'screenshots');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    await page.goto('http://127.0.0.1:5176', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(1500);
    
    // Login
    await page.locator('input[type="email"]').first().fill('aryarajmarketing@gmail.com');
    await page.locator('input[type="password"]').first().fill('123456');
    await page.locator('button[type="submit"], button:has-text("Entrar")').first().click();
    await page.waitForTimeout(3000);
    
    await page.evaluate(() => {
      localStorage.setItem('activeClientId', '11');
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    
    await page.setViewportSize({ width: 1280, height: 800 });

    const atendimentoBtn = page.locator('button:has-text("Atendimento"), aside button:has-text("Atendimento")').first();
    await atendimentoBtn.click();
    await page.waitForTimeout(3500);

    const checkboxes = page.locator('input[type="checkbox"]');
    if (await checkboxes.count() > 1) {
      await checkboxes.nth(1).check();
      await page.waitForTimeout(600);
    }

    const tagBtn = page.locator('button:has-text("Etiquetar")').first();
    await tagBtn.click();
    await page.waitForTimeout(800);

    const contactsCatBtn = page.locator('#btn-category-contacts');
    await contactsCatBtn.click();
    await page.waitForTimeout(600);

    // Digitar nova tag
    const searchInput = page.locator('#bulk-tag-search-input');
    await searchInput.fill('lead-vip');
    await page.waitForTimeout(600);

    const createPath = path.join(dir, 'chat_bulk_tag_contacts_search.png');
    await page.screenshot({ path: createPath });
    console.log(`Screenshot salvo em: ${createPath}`);

  } catch (err) {
    console.error('Erro:', err);
  } finally {
    await browser.close();
  }
}

run();
