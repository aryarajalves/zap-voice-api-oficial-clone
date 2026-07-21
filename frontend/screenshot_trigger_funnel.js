import { chromium } from 'playwright';
import { execSync } from 'child_process';

async function run() {
    console.log('Criando funil de teste ativo no banco de dados para client_id=11...');
    execSync('docker exec zapvoice_app python -c "from database import SessionLocal; import models; db=SessionLocal(); f=db.query(models.Funnel).filter_by(client_id=11, name=\\\"Funil Automacao VIP\\\").first(); f=f or models.Funnel(client_id=11, name=\\\"Funil Automacao VIP\\\"); f.is_active=True; f.is_archived=False; f.steps=[]; db.add(f); db.commit(); print(\\\"Funil garantido ID:\\\", f.id)"');

    console.log('Iniciando Chromium...');
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    page.on('console', msg => console.log(`[CONSOLE]:`, msg.text()));
    page.on('pageerror', err => console.log(`[PAGE ERROR]:`, err.stack));
    
    console.log('Navegando e fazendo login...');
    await page.goto('http://localhost:5176');
    await page.fill('input[type="email"]', 'aryarajmarketing@gmail.com');
    await page.fill('input[type="password"]', '123456');
    await page.click('button[type="submit"]');
    
    console.log('Aguardando painel...');
    await page.waitForTimeout(5000);
    
    console.log('Navegando para atendimento...');
    const chatBtn = page.locator('button:has-text("Atendimento"), [title="Atendimento"], [title="Conversas"]');
    if (await chatBtn.count() > 0) {
        await chatBtn.first().click();
        await page.waitForTimeout(3000);
    }
    
    console.log('Selecionando primeiro contato...');
    const contactCard = page.locator('.cursor-pointer').first();
    if (await contactCard.count() > 0) {
        await contactCard.click();
        await page.waitForTimeout(2000);
        
        console.log('Clicando no botão de Disparar Funil no cabeçalho...');
        const triggerFunnelBtn = page.locator('button[title="Disparar Funil"]');
        if (await triggerFunnelBtn.count() > 0) {
            await triggerFunnelBtn.first().click();
            await page.waitForTimeout(2000);
            
            console.log('Capturando screenshot do modal de disparo de funil...');
            await page.screenshot({ path: 'screenshot_trigger_funnel_modal.png' });
            
            console.log('Selecionando a primeira opção de funil no modal...');
            const funnelOptions = page.locator('div.overflow-y-auto button');
            if (await funnelOptions.count() > 0) {
                await funnelOptions.first().click();
                await page.waitForTimeout(1000);
                
                console.log('Confirmando disparo do funil...');
                const confirmBtn = page.locator('button:has-text("Disparar Funil")');
                await confirmBtn.first().click();
                await page.waitForTimeout(4000);
                
                console.log('Capturando screenshot do banner de execução de funil ativo...');
                await page.screenshot({ path: 'screenshot_funnel_executing_banner.png' });
                console.log('Sucesso completo!');
            } else {
                console.log('Nenhum funil listado no modal.');
            }
        } else {
            console.log('Botão Disparar Funil não encontrado no cabeçalho.');
        }
    } else {
        console.log('Nenhum contato encontrado para testar.');
    }
    
    await browser.close();
}

run().catch(console.error);
