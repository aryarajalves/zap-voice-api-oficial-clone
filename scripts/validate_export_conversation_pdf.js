const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function run() {
    const artifactDir = path.resolve('C:/Users/aryar/.gemini/antigravity/brain/b91b6e3e-e767-451b-8213-fb085411e1a3');
    const screenshotsDir = path.join(__dirname, 'screenshots');
    if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir, { recursive: true });
    }

    console.log('Gerando documento HTML para validação visual...');
    
    global.window = { _env_: {} };
    // Importa dinamicamente a função real
    const { generateConversationDocHtml } = await import('../frontend/src/pages/ChatConversations/exportConversationToDoc.js');

    const sampleConvo = {
        id: 12800,
        contact_name: 'Aryaraj',
        phone: '5585996123586'
    };

    const sampleMessages = [
        // Mensagens do Dia 17 (3 do agente consecutivas -> viram 1 bloco só!)
        { id: 1, sender_type: 'user', content: '😂', timestamp: '2026-08-17T07:33:32Z' },
        { id: 2, sender_type: 'user', content: '😊 😁 😍 💔 💟', timestamp: '2026-08-17T07:33:50Z' },
        { id: 3, sender_type: 'user', content: 'www.google.com.br', timestamp: '2026-08-17T08:35:34Z' },
        // 1 mensagem do cliente
        { id: 4, sender_type: 'contact', content: 'Imagem recebida', message_type: 'image', timestamp: '2026-08-17T08:35:59Z' },
        // 1 anotação do sistema
        { id: 5, sender_type: 'system', content: '🔒 Anotação Privada: Lead demonstrou interesse em fechar o plano anual.', timestamp: '2026-08-17T09:00:00Z' },

        // Mensagens do Dia 18
        { id: 6, sender_type: 'contact', content: 'Bom dia! Gostaria de saber os métodos de pagamento.', timestamp: '2026-08-18T10:15:00Z' },
        { id: 7, sender_type: 'user', content: 'Aceitamos PIX e Cartão de Crédito em até 12x sem juros!', timestamp: '2026-08-18T10:16:00Z' },
        { id: 8, sender_type: 'system', content: '🔒 Anotação Privada: Cliente solicitou cupom de desconto para pagamento à vista.', timestamp: '2026-08-18T10:30:00Z' },

        // Mensagens do Dia 19
        { id: 9, sender_type: 'contact', content: 'Perfeito, pagamento realizado com sucesso!', timestamp: '2026-08-19T14:20:00Z' },
        { id: 10, sender_type: 'user', content: 'Parabéns e seja muito bem-vindo ao ZapVoice! 🎉', timestamp: '2026-08-19T14:21:00Z' }
    ];

    const htmlContent = generateConversationDocHtml(sampleConvo, sampleMessages, '11');

    const testHtmlPath = path.join(__dirname, 'test_export_doc.html');
    fs.writeFileSync(testHtmlPath, htmlContent, 'utf-8');
    console.log(`Documento salvo em: ${testHtmlPath}`);

    console.log('Iniciando Chromium para captura de evidências...');
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1000, height: 850 });

    await page.goto(`file://${testHtmlPath}`);
    await page.waitForTimeout(1000);

    // Evidência 1: Visão geral com bloco único para respostas consecutivas do agente
    console.log('1. Capturando visão geral com respostas consecutivas em bloco único...');
    const pathEvidence1 = path.join(artifactDir, 'evidence_export_unified_blocks.png');
    await page.screenshot({ path: pathEvidence1 });
    await page.screenshot({ path: path.join(screenshotsDir, 'evidence_export_unified_blocks.png') });

    // Evidência 2: Filtrar pela aba 18/08/2026
    console.log('2. Clicando na aba da data 18/08/2026...');
    await page.locator('button[data-date="18/08/2026"]').click();
    await page.waitForTimeout(500);
    const pathEvidence2 = path.join(artifactDir, 'evidence_export_tab_18_august.png');
    await page.screenshot({ path: pathEvidence2 });
    await page.screenshot({ path: path.join(screenshotsDir, 'evidence_export_tab_18_august.png') });

    // Evidência 3: Voltar para Todas as Datas e ativar o filtro "Ocultar anotações privadas"
    console.log('3. Ativando o filtro "Ocultar anotações privadas"...');
    await page.locator('button[data-date="all"]').click();
    await page.locator('#toggle-private-notes').check();
    await page.waitForTimeout(500);
    const pathEvidence3 = path.join(artifactDir, 'evidence_export_private_notes_hidden.png');
    await page.screenshot({ path: pathEvidence3 });
    await page.screenshot({ path: path.join(screenshotsDir, 'evidence_export_private_notes_hidden.png') });

    await browser.close();
    console.log('Validação visual concluída com sucesso!');
}

run().catch(err => {
    console.error('Erro na validação visual:', err);
    process.exit(1);
});
