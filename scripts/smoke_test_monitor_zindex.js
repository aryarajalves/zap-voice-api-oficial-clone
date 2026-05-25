const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function run() {
  const screenshotsDir = path.join(__dirname, 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  console.log('Iniciando teste de z-index e contact_id no Monitor de Pipeline...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));

  try {
    console.log('1. Acessando http://localhost:5176...');
    await page.goto('http://localhost:5176', { waitUntil: 'networkidle', timeout: 20000 });

    // Login
    console.log('2. Preenchendo campos de login...');
    await page.locator('input[type="email"]').first().fill('aryarajmarketing@gmail.com');
    await page.locator('input[type="password"]').first().fill('123456');
    await page.locator('button[type="submit"], button:has-text("Entrar")').first().click();
    await page.waitForTimeout(4000);

    // Navegar para Histórico via Sidebar
    console.log('3. Navegando para o Histórico de Disparos Geral...');
    await page.locator('aside button:has-text("Histórico")').click();
    await page.waitForTimeout(4000);

    // Buscar o primeiro botão "Funis Ativados"
    console.log('4. Buscando botão Funis Ativados...');
    const funnelAtivadosBtn = page.locator('text=Funis Ativados').first();
    if (await funnelAtivadosBtn.isVisible()) {
      await funnelAtivadosBtn.click();
      await page.waitForTimeout(2000);
      
      console.log('5. Capturando screenshot com o modal de Funis Iniciados aberto...');
      await page.screenshot({ path: path.join(screenshotsDir, 'funis_iniciados_open.png') });

      // Clicar em MONITORAR AO VIVO no primeiro item do modal
      console.log('6. Clicando em MONITORAR AO VIVO...');
      const monitorBtn = page.locator('text=MONITORAR AO VIVO').first();
      if (await monitorBtn.isVisible()) {
        await monitorBtn.click();
        await page.waitForTimeout(3000);

        // Tirar print mostrando o z-index sobreposto e a ausência do Contact ID
        console.log('7. Capturando screenshot do Monitor de Pipeline sobreposto...');
        const destPath = path.join(__dirname, '..', 'screenshot_monitor_zindex.png');
        await page.screenshot({ path: destPath });
        console.log(`Print final salvo com sucesso em: ${destPath}`);
      } else {
        console.log('Botão MONITORAR AO VIVO não encontrado (talvez o funil não tenha execuções ou seja follow-up).');
      }
    } else {
      console.log('Nenhum botão "Funis Ativados" encontrado na tabela de Histórico.');
      
      // Tentar ir em Integrações -> Histórico para ver se lá achamos
      console.log('Indo para Integrações Webhook como plano B...');
      const integrationsMenu = page.locator('text=Integrações Webhook').first();
      await integrationsMenu.click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(3500);

      // Clicar em "Histórico" (title="Histórico" ou text="Histórico") da primeira integração
      const historyBtn = page.locator('button:has-text("Histórico"), button[title="Histórico"]').first();
      if (await historyBtn.isVisible()) {
        await historyBtn.click();
        await page.waitForTimeout(3000);

        const funnelAtivadosBtn2 = page.locator('text=Funis Ativados').first();
        if (await funnelAtivadosBtn2.isVisible()) {
          await funnelAtivadosBtn2.click();
          await page.waitForTimeout(2000);

          const monitorBtn = page.locator('text=MONITORAR AO VIVO').first();
          if (await monitorBtn.isVisible()) {
            await monitorBtn.click();
            await page.waitForTimeout(3000);

            const destPath = path.join(__dirname, '..', 'screenshot_monitor_zindex.png');
            await page.screenshot({ path: destPath });
            console.log(`Print final salvo com sucesso via Plano B em: ${destPath}`);
          }
        }
      }
    }

  } catch (error) {
    console.error('Erro na execução do script:', error);
  } finally {
    await browser.close();
    console.log('Fim do teste.');
  }
}

run();
