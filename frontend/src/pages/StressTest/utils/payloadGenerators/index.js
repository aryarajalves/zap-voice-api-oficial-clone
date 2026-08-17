import { getFakeContactData } from './common';
import {
    generateKirvanoPayload,
    generateHotmartPayload,
    generateKiwifyPayload,
    generateEduzzPayload,
    generateTictoPayload,
    generatePepperPayload,
    generateBraipPayload,
    generateMonetizzePayload,
    generateCaktoPayload,
    generateLastlinkPayload,
} from './ecommerceGenerators';
import { generateGreennPayload } from './greennGenerators';
import {
    generateGuruPayload,
    generateHeroSparkPayload,
    generateHublaPayload,
    generateElementorPayload,
    generatePagTrustPayload,
    generateZapGroupPayload,
} from './advancedGenerators';

export function generateWebhookPayload(platform, eventType, index) {
    const { name, email, phone } = getFakeContactData(index);

    switch (platform?.toLowerCase()) {
        case 'kirvano':
            return generateKirvanoPayload(eventType, index);
        case 'hotmart':
            return generateHotmartPayload(eventType, index);
        case 'kiwify':
            return generateKiwifyPayload(eventType, index);
        case 'eduzz':
            return generateEduzzPayload(eventType, index);
        case 'ticto':
            return generateTictoPayload(eventType, index);
        case 'pepper':
            return generatePepperPayload(eventType, index);
        case 'braip':
            return generateBraipPayload(eventType, index);
        case 'monetizze':
            return generateMonetizzePayload(eventType, index);
        case 'cakto':
            return generateCaktoPayload(eventType, index);
        case 'lastlink':
            return generateLastlinkPayload(eventType, index);
        case 'guru':
            return generateGuruPayload(eventType, index);
        case 'herospark':
            return generateHeroSparkPayload(eventType, index);
        case 'greenn':
            return generateGreennPayload(eventType, index);
        case 'hubla':
            return generateHublaPayload(eventType, index);
        case 'elementor':
            return generateElementorPayload(eventType, index);
        case 'pagtrust':
            return generatePagTrustPayload(eventType, index);
        case 'zapgroup':
            return generateZapGroupPayload(index);
        default:
            return {
                event: eventType,
                contact: { name, email, phone },
                product: { name: 'Produto Scale Test' },
                timestamp: new Date().toISOString()
            };
    }
}
