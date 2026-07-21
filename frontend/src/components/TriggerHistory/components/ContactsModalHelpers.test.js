import { describe, it, expect } from 'vitest';
import { getExplanationKey, ERROR_EXPLANATIONS } from './ContactsModalHelpers';

describe('ContactsModalHelpers - Error Explanations', () => {
    it('should map the Meta 131050 error correctly to MARKETING_OPT_OUT', () => {
        const reason = 'Erro Meta 131050: Unable to deliver the message. This recipient has chosen to stop receiving marketing messages on WhatsApp from your business';
        const key = getExplanationKey(reason);
        expect(key).toBe('MARKETING_OPT_OUT');
        
        const explanation = ERROR_EXPLANATIONS[key];
        expect(explanation).toBeDefined();
        expect(explanation.titulo).toBe('Mensagens de Marketing Recusadas');
        expect(explanation.descricao).toContain('optou por não receber mensagens de marketing');
    });

    it('should map the Meta 130472 error correctly to META_EXPERIMENT', () => {
        const reason = "Erro Meta 130472: User's number is part of an experiment";
        const key = getExplanationKey(reason);
        expect(key).toBe('META_EXPERIMENT');
        
        const explanation = ERROR_EXPLANATIONS[key];
        expect(explanation).toBeDefined();
        expect(explanation.titulo).toBe('Número em Experimento da Meta');
        expect(explanation.descricao).toContain('faz parte de um grupo de testes');
    });

    it('should return null for unmapped errors', () => {
        const key = getExplanationKey('Unknown Error 999999');
        expect(key).toBeNull();
    });
});
