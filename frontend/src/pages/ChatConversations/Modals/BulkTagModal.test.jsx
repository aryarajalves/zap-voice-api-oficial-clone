import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import BulkTagModal from './BulkTagModal';

describe('BulkTagModal Unit Tests', () => {
    it('renderiza categorias Chat e Contatos, etiquetas e contagem', () => {
        const chatLabels = ['compra-aprovada', 'suporte-chat'];
        const contactLabels = ['lead-organico', 'tag-contatos'];
        const onClose = vi.fn();
        const onApply = vi.fn();

        render(
            <BulkTagModal
                isOpen={true}
                onClose={onClose}
                chatLabels={chatLabels}
                contactLabels={contactLabels}
                selectedBulkTag=""
                setSelectedBulkTag={vi.fn()}
                customBulkTag=""
                setCustomBulkTag={vi.fn()}
                onApply={onApply}
                isApplying={false}
                selectedCount={3}
            />
        );

        expect(screen.getByText('Etiquetar Contatos')).toBeDefined();
        expect(screen.getByText('3')).toBeDefined();
        expect(screen.getByText('Etiqueta do Chat')).toBeDefined();
        expect(screen.getByText('Aba de Contatos')).toBeDefined();
        // Por padrão inicia em Chat
        expect(screen.getByText('compra-aprovada')).toBeDefined();
        expect(screen.getByText('suporte-chat')).toBeDefined();
        expect(screen.queryByText('lead-organico')).toBeNull();
    });

    it('alterna para Aba de Contatos e exibe as etiquetas de contatos', () => {
        const chatLabels = ['chat-tag'];
        const contactLabels = ['lead-organico', 'tag-contatos'];
        render(
            <BulkTagModal
                isOpen={true}
                onClose={vi.fn()}
                chatLabels={chatLabels}
                contactLabels={contactLabels}
                selectedBulkTag=""
                setSelectedBulkTag={vi.fn()}
                customBulkTag=""
                setCustomBulkTag={vi.fn()}
                onApply={vi.fn()}
                isApplying={false}
                selectedCount={1}
            />
        );

        const contactsBtn = screen.getByText('Aba de Contatos');
        fireEvent.click(contactsBtn);

        expect(screen.getByText('lead-organico')).toBeDefined();
        expect(screen.getByText('tag-contatos')).toBeDefined();
        expect(screen.queryByText('chat-tag')).toBeNull();
    });

    it('filtra etiquetas em tempo real ao digitar no campo de busca', () => {
        const chatLabels = ['compra-aprovada', 'lead-quente', 'contato-ativo'];
        render(
            <BulkTagModal
                isOpen={true}
                onClose={vi.fn()}
                chatLabels={chatLabels}
                selectedBulkTag=""
                setSelectedBulkTag={vi.fn()}
                customBulkTag=""
                setCustomBulkTag={vi.fn()}
                onApply={vi.fn()}
                isApplying={false}
                selectedCount={1}
            />
        );

        const searchInput = screen.getByPlaceholderText('Digite o nome da etiqueta do Chat...');
        fireEvent.change(searchInput, { target: { value: 'quente' } });

        expect(screen.getByText('lead-quente')).toBeDefined();
        expect(screen.queryByText('compra-aprovada')).toBeNull();
        expect(screen.queryByText('contato-ativo')).toBeNull();
    });

    it('permite selecionar etiqueta e chama onApply com target correspondente', () => {
        const chatLabels = ['compra-aprovada'];
        const onApply = vi.fn();
        const setSelectedBulkTag = vi.fn();

        render(
            <BulkTagModal
                isOpen={true}
                onClose={vi.fn()}
                chatLabels={chatLabels}
                selectedBulkTag="compra-aprovada"
                setSelectedBulkTag={setSelectedBulkTag}
                customBulkTag=""
                setCustomBulkTag={vi.fn()}
                onApply={onApply}
                isApplying={false}
                selectedCount={2}
            />
        );

        const applyBtn = screen.getByText('Aplicar no Chat');
        expect(applyBtn.disabled).toBe(false);
        fireEvent.click(applyBtn);
        expect(onApply).toHaveBeenCalledWith(['compra-aprovada'], 'chat');
    });

    it('permite aplicar etiqueta em Contatos com target contacts', () => {
        const contactLabels = ['lead-vip'];
        const onApply = vi.fn();

        render(
            <BulkTagModal
                isOpen={true}
                onClose={vi.fn()}
                contactLabels={contactLabels}
                selectedBulkTag="lead-vip"
                setSelectedBulkTag={vi.fn()}
                customBulkTag=""
                setCustomBulkTag={vi.fn()}
                onApply={onApply}
                isApplying={false}
                selectedCount={2}
            />
        );

        // Muda para Aba de Contatos
        fireEvent.click(screen.getByText('Aba de Contatos'));

        // Seleciona a tag lead-vip
        fireEvent.click(screen.getByText('lead-vip'));

        const applyBtn = screen.getByText('Aplicar em Contatos');
        expect(applyBtn.disabled).toBe(false);
        fireEvent.click(applyBtn);
        expect(onApply).toHaveBeenCalledWith(['lead-vip'], 'contacts');
    });

    it('permite selecionar múltiplas etiquetas de uma vez e exibe quantidade no botão de aplicar', () => {
        const chatLabels = ['compra-aprovada', 'suporte-vip', 'interessado'];
        const onApply = vi.fn();

        render(
            <BulkTagModal
                isOpen={true}
                onClose={vi.fn()}
                chatLabels={chatLabels}
                selectedBulkTag=""
                setSelectedBulkTag={vi.fn()}
                customBulkTag=""
                setCustomBulkTag={vi.fn()}
                onApply={onApply}
                isApplying={false}
                selectedCount={5}
            />
        );

        // Seleciona compra-aprovada
        fireEvent.click(screen.getByText('compra-aprovada'));
        // Seleciona suporte-vip
        fireEvent.click(screen.getByText('suporte-vip'));

        expect(screen.getByText('Etiquetas selecionadas (2):')).toBeDefined();
        const applyBtn = screen.getByText('Aplicar 2 etiquetas no Chat');
        expect(applyBtn.disabled).toBe(false);

        fireEvent.click(applyBtn);
        expect(onApply).toHaveBeenCalledWith(['compra-aprovada', 'suporte-vip'], 'chat');
    });

    it('permite desmarcar e remover etiquetas selecionadas', () => {
        const chatLabels = ['compra-aprovada', 'suporte-vip'];

        render(
            <BulkTagModal
                isOpen={true}
                onClose={vi.fn()}
                chatLabels={chatLabels}
                selectedBulkTag=""
                setSelectedBulkTag={vi.fn()}
                customBulkTag=""
                setCustomBulkTag={vi.fn()}
                onApply={vi.fn()}
                isApplying={false}
                selectedCount={2}
            />
        );

        // Seleciona as duas
        fireEvent.click(screen.getByText('compra-aprovada'));
        fireEvent.click(screen.getByText('suporte-vip'));
        expect(screen.getByText('Etiquetas selecionadas (2):')).toBeDefined();

        // Clica no botão de remover a tag suporte-vip no chip
        const removeBtn = screen.getByTitle('Remover suporte-vip');
        fireEvent.click(removeBtn);

        expect(screen.getByText('Etiqueta selecionada:')).toBeDefined();
        expect(screen.getByText('Aplicar no Chat')).toBeDefined();
    });

    it('exibe opção para criar nova etiqueta quando o termo não existe na lista', () => {
        const chatLabels = ['compra-aprovada'];
        const setCustomBulkTag = vi.fn();

        render(
            <BulkTagModal
                isOpen={true}
                onClose={vi.fn()}
                chatLabels={chatLabels}
                selectedBulkTag=""
                setSelectedBulkTag={vi.fn()}
                customBulkTag=""
                setCustomBulkTag={setCustomBulkTag}
                onApply={vi.fn()}
                isApplying={false}
                selectedCount={1}
            />
        );

        const searchInput = screen.getByPlaceholderText('Digite o nome da etiqueta do Chat...');
        fireEvent.change(searchInput, { target: { value: 'nova-tag' } });

        const createButton = screen.getByText(/Criar e selecionar nova etiqueta no Chat:/);
        expect(createButton).toBeDefined();

        fireEvent.click(createButton);
        expect(setCustomBulkTag).toHaveBeenCalledWith('nova-tag');
    });

    it('chama loadAvailableLabels ao abrir o modal para garantir etiquetas frescas', () => {
        const loadAvailableLabels = vi.fn();

        render(
            <BulkTagModal
                isOpen={true}
                onClose={vi.fn()}
                chatLabels={[]}
                contactLabels={[]}
                selectedBulkTag=""
                setSelectedBulkTag={vi.fn()}
                customBulkTag=""
                setCustomBulkTag={vi.fn()}
                onApply={vi.fn()}
                isApplying={false}
                selectedCount={1}
                loadAvailableLabels={loadAvailableLabels}
            />
        );

        expect(loadAvailableLabels).toHaveBeenCalled();
    });

    it('não limpa a busca nem refaz chamadas a loadAvailableLabels durante digitação contínua', () => {
        const loadAvailableLabels = vi.fn();

        const { rerender } = render(
            <BulkTagModal
                isOpen={true}
                onClose={vi.fn()}
                chatLabels={['compra-aprovada', 'suporte-vip']}
                contactLabels={[]}
                selectedBulkTag=""
                setSelectedBulkTag={vi.fn()}
                customBulkTag=""
                setCustomBulkTag={vi.fn()}
                onApply={vi.fn()}
                isApplying={false}
                selectedCount={1}
                loadAvailableLabels={loadAvailableLabels}
            />
        );

        expect(loadAvailableLabels).toHaveBeenCalledTimes(1);

        const searchInput = screen.getByPlaceholderText('Digite o nome da etiqueta do Chat...');
        fireEvent.change(searchInput, { target: { value: 'vip' } });
        expect(searchInput.value).toBe('vip');

        // Simula re-renderização externa (ex: passagem de nova referência de função ou ciclo de polling)
        const newLoadAvailableLabelsRef = vi.fn();
        rerender(
            <BulkTagModal
                isOpen={true}
                onClose={vi.fn()}
                chatLabels={['compra-aprovada', 'suporte-vip']}
                contactLabels={[]}
                selectedBulkTag=""
                setSelectedBulkTag={vi.fn()}
                customBulkTag=""
                setCustomBulkTag={vi.fn()}
                onApply={vi.fn()}
                isApplying={false}
                selectedCount={1}
                loadAvailableLabels={newLoadAvailableLabelsRef}
            />
        );

        // O valor digitado não pode ser apagado e a função não pode ser chamada novamente
        expect(searchInput.value).toBe('vip');
        expect(newLoadAvailableLabelsRef).not.toHaveBeenCalled();
        expect(screen.getByText('suporte-vip')).toBeDefined();
        expect(screen.queryByText('compra-aprovada')).toBeNull();
    });
});
