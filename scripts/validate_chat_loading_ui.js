const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function run() {
    const artifactDir = path.resolve('C:/Users/aryar/.gemini/antigravity/brain/b91b6e3e-e767-451b-8213-fb085411e1a3');
    const screenshotsDir = path.join(__dirname, 'screenshots');
    if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir, { recursive: true });
    }

    console.log('Iniciando o navegador Chromium...');
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1280, height: 850 });

    try {
        console.log('Navegando para o frontend do ZapVoice...');
        await page.goto('http://localhost:5176', { waitUntil: 'networkidle', timeout: 30000 });

        // Login
        console.log('Preenchendo credenciais de login...');
        await page.locator('input[type="email"]').first().fill('aryarajmarketing@gmail.com');
        await page.locator('input[type="password"]').first().fill('123456');
        await page.locator('button[type="submit"], button:has-text("Entrar")').first().click();

        console.log('Aguardando login...');
        await page.waitForTimeout(5000);

        // Selecionar cliente se necessário
        const hasNoClient = await page.locator('button:has-text("Sem cliente selecionado")').count();
        if (hasNoClient > 0) {
            console.log('Selecionando o primeiro cliente disponível...');
            await page.locator('button:has-text("Sem cliente selecionado")').click();
            await page.waitForTimeout(1000);
            await page.locator('div.max-h-60 button').first().click();
            await page.waitForTimeout(3000);
        }

        // Navegar para Atendimento
        console.log('Navegando para a página de Atendimento...');
        await page.locator('button:has-text("Atendimento"), aside button:has-text("Atendimento")').first().click();
        await page.waitForTimeout(3000);

        // Intercepta e atrasa a resposta da API de mensagens para capturar a tela de carregamento de forma nítida
        console.log('Configurando interceptação de rota para capturar a tela de loading...');
        let routeDelayed = false;
        await page.route('**/chat/conversations/*/messages?limit=*', async (route) => {
            if (!routeDelayed) {
                routeDelayed = true;
                console.log('Interceptando requisição de mensagens para screenshot de loading...');
                // Aguarda 1.8 segundos para capturar o loading
                await new Promise(r => setTimeout(r, 1800));
            }
            await route.continue();
        });

        // Clica na primeira conversa da lista lateral
        console.log('Clicando na conversa da lista lateral...');
        const convoItem = page.locator('div.divide-y > div, div.cursor-pointer').first();
        await convoItem.click();

        // Aguarda 400ms enquanto está carregando para capturar a tela de loading
        await page.waitForTimeout(400);

        console.log('1. Capturando tela de carregamento da conversa (Loading Screen)...');
        const pathLoading = path.join(artifactDir, 'evidence_chat_loading_screen.png');
        await page.screenshot({ path: pathLoading });
        await page.screenshot({ path: path.join(screenshotsDir, 'evidence_chat_loading_screen.png') });

        // Aguarda a resposta completar e as mensagens renderizarem 100%
        console.log('Aguardando conclusão do carregamento 100%...');
        await page.waitForTimeout(3000);

        console.log('2. Capturando tela com mensagens 100% carregadas e prontas...');
        const pathLoaded = path.join(artifactDir, 'evidence_chat_loaded_100.png');
        await page.screenshot({ path: pathLoaded });
        await page.screenshot({ path: path.join(screenshotsDir, 'evidence_chat_loaded_100.png') });

        console.log('Validação visual concluída com sucesso!');
    } finally {
        await browser.close();
    }
}

run().catch(err => {
    console.error('Erro na validação visual do chat:', err);
    process.exit(1);
});
