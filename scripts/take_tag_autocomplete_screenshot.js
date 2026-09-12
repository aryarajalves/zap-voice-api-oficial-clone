const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function run() {
  const dir = path.join(__dirname, 'screenshots');
  if (!fs.existsSync(dir)){
    fs.mkdirSync(dir, { recursive: true });
  }

  const sampleCsvPath = path.join(__dirname, 'sample_import.csv');
  fs.writeFileSync(sampleCsvPath, 'Nome,Telefone,Email,Tags\nJoão Silva,5511999998888,joao@teste.com,cliente-vip\nMaria Santos,5511988887777,maria@teste.com,lead-quente\n');

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
    await page.waitForTimeout(6000);
    
    // Selecionar cliente se não houver cliente ativo
    const hasNoClient = await page.locator('button:has-text("Sem cliente selecionado")').count();
    if (hasNoClient > 0) {
      console.log('Nenhum cliente ativo. Selecionando o primeiro disponível...');
      await page.locator('button:has-text("Sem cliente selecionado")').click();
      await page.waitForTimeout(1000);
      await page.locator('div.max-h-60 button').first().click();
      await page.waitForTimeout(3000);
    }
    
    await page.setViewportSize({ width: 1366, height: 900 });

    // Navegar para Contatos via Sidebar
    console.log('Navegando para a aba Contatos...');
    await page.locator('aside button:has-text("Contatos")').first().click();
    await page.waitForTimeout(3000);
    
    // Clicar em "Importar"
    console.log('Clicando em Importar...');
    await page.locator('button:has-text("Importar")').click({ force: true });
    await page.waitForTimeout(2000);
    
    // Passo 1: Enviar arquivo CSV
    console.log('Enviando arquivo CSV...');
    const fileInput = await page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(sampleCsvPath);
    await page.waitForTimeout(3000);

    // Verificar Passo 2
    console.log('Verificando Passo 2...');
    await page.waitForSelector('text=Passo 2 de 3', { timeout: 10000 });
    
    const tagInput = page.locator('input[placeholder*="ex: lead, cliente-vip"]').first();
    await tagInput.scrollIntoViewIfNeeded();

    // Cenário 1: Digitar 'comp' para filtrar etiquetas existentes ('Compra Aprovada')
    console.log('Testando digitação com filtro existente (comp)...');
    await tagInput.click();
    await tagInput.fill('comp');
    await page.waitForTimeout(1500);

    console.log('Capturando print do autocomplete filtrando existentes...');
    await page.screenshot({ path: 'scripts/screenshots/tag_autocomplete_filtrando.png' });
    console.log('Print salvo: scripts/screenshots/tag_autocomplete_filtrando.png');

    // Cenário 2: Digitar algo inexistente
    console.log('Testando digitação de etiqueta inexistente...');
    await tagInput.fill('promocao-natal-2026');
    await page.waitForTimeout(1500);

    console.log('Capturando print do aviso de criação de nova etiqueta...');
    await page.screenshot({ path: 'scripts/screenshots/tag_autocomplete_criar_nova.png' });
    console.log('Print salvo: scripts/screenshots/tag_autocomplete_criar_nova.png');

    // Cenário 3: Clicar para criar a nova etiqueta
    console.log('Clicando na opção de criar nova etiqueta...');
    const createBtn = page.locator('button:has-text("Criar nova etiqueta")').first();
    if (await createBtn.count() > 0) {
      await createBtn.click();
      await page.waitForTimeout(1000);
      console.log('Capturando print com o chip adicionado...');
      await page.screenshot({ path: 'scripts/screenshots/tag_chip_adicionado.png' });
      console.log('Print salvo: scripts/screenshots/tag_chip_adicionado.png');
    }

  } catch (err) {
    console.error('Erro no teste visual:', err);
    await page.screenshot({ path: 'scripts/screenshots/tag_autocomplete_error.png' });
  } finally {
    if (fs.existsSync(sampleCsvPath)) {
      try { fs.unlinkSync(sampleCsvPath); } catch (_) {}
    }
    await browser.close();
  }
}

run();
