import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ExportConversationModal from './ExportConversationModal';

describe('ExportConversationModal', () => {
    it('não renderiza nada quando isOpen for false', () => {
        const { container } = render(
            <ExportConversationModal
                isOpen={false}
                status="exporting"
                onClose={() => {}}
            />
        );
        expect(container.firstChild).toBeNull();
    });

    it('exibe o estado de exportando com spinner, contato, telefone, mensagens e barra de progresso', () => {
        render(
            <ExportConversationModal
                isOpen={true}
                status="exporting"
                contactName="Juliana Silva"
                phone="5511988881006"
                totalMessages={150}
                onClose={() => {}}
            />
        );

        expect(screen.getByText('Exportando Conversa...')).toBeInTheDocument();
        expect(screen.getByText(/Processando histórico, agrupando datas/i)).toBeInTheDocument();
        expect(screen.getByText('Juliana Silva')).toBeInTheDocument();
        expect(screen.getByText('5511988881006')).toBeInTheDocument();
        expect(screen.getByText('150 carregadas')).toBeInTheDocument();
        expect(screen.getByText(/Por favor, aguarde alguns instantes.../i)).toBeInTheDocument();
    });

    it('exibe o estado de conclusão com aviso de sucesso, nome do arquivo e botão de concluir', () => {
        const onCloseMock = vi.fn();

        render(
            <ExportConversationModal
                isOpen={true}
                status="completed"
                contactName="Juliana Silva"
                phone="5511988881006"
                totalMessages={150}
                fileName="historico_conversa_juliana_silva_#13812.html"
                onClose={onCloseMock}
            />
        );

        expect(screen.getByText('Conversa Exportada com Sucesso!')).toBeInTheDocument();
        expect(screen.getByText(/O arquivo do histórico completo foi gerado e o download já começou/i)).toBeInTheDocument();
        expect(screen.getByText('historico_conversa_juliana_silva_#13812.html')).toBeInTheDocument();
        expect(screen.getByText('150 mensagens')).toBeInTheDocument();
        expect(screen.getByText('HTML Interativo / PDF')).toBeInTheDocument();

        const btnConcluir = screen.getByRole('button', { name: /Concluir/i });
        expect(btnConcluir).toBeInTheDocument();

        fireEvent.click(btnConcluir);
        expect(onCloseMock).toHaveBeenCalledTimes(1);
    });

    it('exibe o estado de erro com mensagem explicativa e botão de fechar', () => {
        const onCloseMock = vi.fn();

        render(
            <ExportConversationModal
                isOpen={true}
                status="error"
                errorMessage="Erro na conexão com o servidor ao buscar histórico completo."
                onClose={onCloseMock}
            />
        );

        expect(screen.getByText('Falha ao Exportar')).toBeInTheDocument();
        expect(screen.getByText('Erro na conexão com o servidor ao buscar histórico completo.')).toBeInTheDocument();

        const btnFechar = screen.getByRole('button', { name: /Fechar/i });
        expect(btnFechar).toBeInTheDocument();

        fireEvent.click(btnFechar);
        expect(onCloseMock).toHaveBeenCalledTimes(1);
    });
});
