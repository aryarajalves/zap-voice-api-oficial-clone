import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ChatContactSidebar from './ChatContactSidebar';
import ContactProfileCard from './components/ChatContactSidebar/ContactProfileCard';
import ContactTagsSection from './components/ChatContactSidebar/ContactTagsSection';
import MaximizedNoteModal from './components/ChatContactSidebar/MaximizedNoteModal';
import NewTagModal from './components/ChatContactSidebar/NewTagModal';

describe('ChatContactSidebar and Subcomponents', () => {
    const mockSelectedConvo = {
        id: 123,
        contact_name: 'Maria Silva',
        phone: '5511999998888',
        assigned_to: '',
        labels: ['VIP', 'Lead Quente']
    };

    const mockAgents = [
        { id: 1, full_name: 'Atendente 1', email: 'atendente1@teste.com' },
        { id: 2, full_name: 'Atendente 2', email: 'atendente2@teste.com' }
    ];

    const defaultProps = {
        selectedConvo: mockSelectedConvo,
        setSelectedConvo: vi.fn(),
        timeLeft24h: '18h 30m',
        handleClose24hWindow: vi.fn(),
        isAssigning: false,
        availableAgents: mockAgents,
        handleAssignConversation: vi.fn(),
        availableLabels: ['VIP', 'Lead Quente', 'Suporte', 'Financeiro'],
        getLabelColor: (tag) => (tag === 'VIP' ? '#EF4444' : '#3B82F6'),
        handleRemoveTag: vi.fn(),
        tagSearchQuery: '',
        setTagSearchQuery: vi.fn(),
        isTagDropdownOpen: false,
        setIsTagDropdownOpen: vi.fn(),
        handleAddTagWithName: vi.fn(),
        privateNote: 'Cliente prefere contato via WhatsApp',
        setPrivateNote: vi.fn(),
        isSavingNote: false,
        handleSaveNote: vi.fn(),
        getFirstName: (name) => name.split(' ')[0]
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Main ChatContactSidebar Integration', () => {
        it('renders contact profile details correctly', () => {
            render(<ChatContactSidebar {...defaultProps} />);
            expect(screen.getByText('Maria Silva')).toBeInTheDocument();
            expect(screen.getByText('5511999998888')).toBeInTheDocument();
            expect(screen.getByText('ID da Conversa: #123')).toBeInTheDocument();
            expect(screen.getByText(/Janela 24h: 18h 30m/i)).toBeInTheDocument();
        });

        it('renders Limpar Conversa button and triggers onOpenClearModal when clicked', () => {
            const onOpenClearModal = vi.fn();
            render(<ChatContactSidebar {...defaultProps} onOpenClearModal={onOpenClearModal} />);
            const clearBtn = screen.getByRole('button', { name: /Limpar Conversa/i });
            expect(clearBtn).toBeInTheDocument();
            fireEvent.click(clearBtn);
            expect(onOpenClearModal).toHaveBeenCalledTimes(1);
        });

        it('allows selecting an agent to assign conversation', () => {
            render(<ChatContactSidebar {...defaultProps} />);
            const select = screen.getByRole('combobox');
            fireEvent.change(select, { target: { value: '2' } });
            expect(defaultProps.handleAssignConversation).toHaveBeenCalledWith('2');
        });

        it('handles private note typing and saving', () => {
            render(<ChatContactSidebar {...defaultProps} />);
            const saveBtn = screen.getByText('Salvar Anotação');
            fireEvent.click(saveBtn);
            expect(defaultProps.handleSaveNote).toHaveBeenCalled();
        });

        it('opens maximized note modal on click', () => {
            render(<ChatContactSidebar {...defaultProps} />);
            const maximizeBtn = screen.getByTitle('Maximizar tela para digitar anotação com mais espaço');
            fireEvent.click(maximizeBtn);
            expect(screen.getByText(/Anotação Privada — Maria Silva/i)).toBeInTheDocument();
        });

        it('renders Mídia, links e docs section and opens modal on click', () => {
            const setIsMediaModalOpen = vi.fn();
            render(
                <ChatContactSidebar
                    {...defaultProps}
                    mediaData={{ total_all: 5, total_media: 3, total_docs: 1, total_links: 1, media: [], docs: [], links: [] }}
                    setIsMediaModalOpen={setIsMediaModalOpen}
                />
            );
            expect(screen.getByText('Mídia, links e docs')).toBeInTheDocument();
            expect(screen.getByText('5')).toBeInTheDocument();

            fireEvent.click(screen.getByText('Mídia, links e docs'));
            expect(setIsMediaModalOpen).toHaveBeenCalledWith(true);
        });
    });

    describe('ContactProfileCard', () => {
        it('shows closed window badge when 24h window is closed', () => {
            render(
                <ContactProfileCard
                    selectedConvo={mockSelectedConvo}
                    setSelectedConvo={vi.fn()}
                    timeLeft24h="Janela Fechada"
                    handleClose24hWindow={vi.fn()}
                    getFirstName={(n) => n.split(' ')[0]}
                />
            );
            expect(screen.getByText(/Janela 24h: Janela Fechada/i)).toBeInTheDocument();
            expect(screen.queryByText(/Encerrar Janela 24h/i)).not.toBeInTheDocument();
        });

        it('triggers handleClose24hWindow on button click when window is open', () => {
            const handleClose = vi.fn();
            render(
                <ContactProfileCard
                    selectedConvo={mockSelectedConvo}
                    setSelectedConvo={vi.fn()}
                    timeLeft24h="10h restando"
                    handleClose24hWindow={handleClose}
                    getFirstName={(n) => n.split(' ')[0]}
                />
            );
            const closeBtn = screen.getByText(/Encerrar Janela 24h/i);
            fireEvent.click(closeBtn);
            expect(handleClose).toHaveBeenCalled();
        });
    });

    describe('ContactTagsSection', () => {
        it('renders tags and triggers remove tag', () => {
            const handleRemove = vi.fn();
            render(
                <ContactTagsSection
                    labels={['VIP', 'Lead']}
                    availableLabels={['VIP', 'Lead', 'Outro']}
                    getLabelColor={() => '#3B82F6'}
                    handleRemoveTag={handleRemove}
                    tagSearchQuery=""
                    setTagSearchQuery={vi.fn()}
                    isTagDropdownOpen={false}
                    setIsTagDropdownOpen={vi.fn()}
                    handleTagSubmit={vi.fn()}
                />
            );
            expect(screen.getByText(/VIP/)).toBeInTheDocument();
            const removeBtn = screen.getByLabelText('Remover tag VIP');
            fireEvent.click(removeBtn);
            expect(handleRemove).toHaveBeenCalledWith('VIP');
        });
    });

    describe('MaximizedNoteModal', () => {
        it('renders textarea and allows closing', () => {
            const onClose = vi.fn();
            render(
                <MaximizedNoteModal
                    isOpen={true}
                    onClose={onClose}
                    contactName="Maria Silva"
                    phone="5511999998888"
                    privateNote="Nota de teste"
                    setPrivateNote={vi.fn()}
                    isSavingNote={false}
                    handleSaveNote={vi.fn()}
                />
            );
            expect(screen.getByText(/Anotação Privada — Maria Silva/i)).toBeInTheDocument();
            const closeBtn = screen.getByTitle('Fechar modal');
            fireEvent.click(closeBtn);
            expect(onClose).toHaveBeenCalled();
        });
    });

    describe('NewTagModal', () => {
        it('renders color choices and triggers add tag with color', async () => {
            const handleAdd = vi.fn();
            const setModalData = vi.fn();
            render(
                <NewTagModal
                    newTagModalData={{ isOpen: true, name: 'NovaTag', color: '#EF4444' }}
                    setNewTagModalData={setModalData}
                    handleAddTagWithName={handleAdd}
                />
            );
            expect(screen.getByText('Escolher Cor para Novo Marcador')).toBeInTheDocument();
            const createBtn = screen.getByText('Criar e Aplicar Marcador');
            fireEvent.click(createBtn);
            expect(handleAdd).toHaveBeenCalledWith('NovaTag', '#EF4444');
        });
    });

    describe('ContactProfileCard Message Accounting', () => {
        it('renders message count sent by user and agent correctly', () => {
            render(
                <ContactProfileCard
                    selectedConvo={mockSelectedConvo}
                    setSelectedConvo={vi.fn()}
                    timeLeft24h="22h 10m"
                    handleClose24hWindow={vi.fn()}
                    getFirstName={(name) => name.split(' ')[0]}
                    onShareContact={vi.fn()}
                    userMessagesCount={45}
                    agentMessagesCount={32}
                    totalMessagesCount={77}
                />
            );

            expect(screen.getByText('45')).toBeInTheDocument();
            expect(screen.getByText('32')).toBeInTheDocument();
            expect(screen.getByText('77 total')).toBeInTheDocument();
            expect(screen.getByText('Usuário')).toBeInTheDocument();
            expect(screen.getByText('Agente')).toBeInTheDocument();
        });

        it('ChatContactSidebar calculates and passes message counts from mediaData or messages array', () => {
            const mockMessages = [
                { id: 1, sender_type: 'contact', content: 'Oi' },
                { id: 2, sender_type: 'contact', content: 'Tudo bem?' },
                { id: 3, sender_type: 'user', content: 'Olá! Como posso ajudar?' }
            ];

            render(
                <ChatContactSidebar
                    {...defaultProps}
                    messages={mockMessages}
                    mediaData={{ user_messages_count: 15, agent_messages_count: 20, total_messages: 35 }}
                />
            );

            expect(screen.getByText('15')).toBeInTheDocument();
            expect(screen.getByText('20')).toBeInTheDocument();
            expect(screen.getByText('35 total')).toBeInTheDocument();
        });
    });
});

