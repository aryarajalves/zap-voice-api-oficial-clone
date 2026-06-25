import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import TemplateBulkSender from './TemplateBulkSender';

// Mock do hook useBulkSender
const mockBulkBase = {
    step: 1,
    setStep: vi.fn(),
    isGuideOpen: false,
    setIsGuideOpen: vi.fn(),
    isWorking: false,
    isSending: false,
    workingMessage: '',
    templates: [],
    isLoadingTemplates: false,
    chatwootLabels: [],
    isLoadingChatwootLabels: false,
    funnels: [],
    isLoadingFunnels: false,
    selectedTemplate: '',
    setSelectedTemplate: vi.fn(),
    templateSearch: '',
    setTemplateSearch: vi.fn(),
    isTemplateDropdownOpen: false,
    setIsTemplateDropdownOpen: vi.fn(),
    templateParams: {},
    setTemplateParams: vi.fn(),
    buttonActions: {},
    setButtonActions: vi.fn(),
    sendPrivateMessage: false,
    setSendPrivateMessage: vi.fn(),
    privateMessageText: '',
    setPrivateMessageText: vi.fn(),
    privateMessageDelay: 15,
    setPrivateMessageDelay: vi.fn(),
    privateMessageDelayUnit: 'seconds',
    setPrivateMessageDelayUnit: vi.fn(),
    privateMessageConcurrency: 1,
    setPrivateMessageConcurrency: vi.fn(),
    selectedChatwootLabels: [],
    setSelectedChatwootLabels: vi.fn(),
    finalContacts: [],
    selectionMetadata: {},
    delaySeconds: 1,
    setDelaySeconds: vi.fn(),
    delayUnit: 'seconds',
    setDelayUnit: vi.fn(),
    concurrency: 4,
    setConcurrency: vi.fn(),
    scheduledTime: '',
    setScheduledTime: vi.fn(),
    exclusionList: [],
    setExclusionList: vi.fn(),
    exclusionMode: 'manual',
    setExclusionMode: vi.fn(),
    exclusionText: '',
    setExclusionText: vi.fn(),
    exclusionAvailableTags: [],
    isLoadingExclusionTags: false,
    selectedExclusionTag: [],
    setSelectedExclusionTag: vi.fn(),
    exclusionTagMode: 'OR',
    setExclusionTagMode: vi.fn(),
    exclusionCsvData: null,
    exclusionColSelector: false,
    setExclusionColSelector: vi.fn(),
    exclusionSelectedCol: null,
    setExclusionSelectedCol: vi.fn(),
    isRecurring: false,
    setIsRecurring: vi.fn(),
    recurrenceFrequency: 'weekly',
    setRecurrenceFrequency: vi.fn(),
    recurrenceDaysOfWeek: [],
    setRecurrenceDaysOfWeek: vi.fn(),
    recurrenceDayOfMonth: '',
    setRecurrenceDayOfMonth: vi.fn(),
    recurrenceTime: '09:00',
    setRecurrenceTime: vi.fn(),
    expansionModal: { isOpen: false, title: '', key: '', value: '' },
    setExpansionModal: vi.fn(),
    whatsappProfile: null,
    isValidated: false,
    handleTemplateChange: vi.fn(),
    handleRecipientSelect: vi.fn(),
    handleReset: vi.fn(),
    handleSaveExclusion: vi.fn(),
    handleExclusionFileUpload: vi.fn(),
    confirmExclusionColumn: vi.fn(),
    loadExclusionContactsByTag: vi.fn(),
    handleSend: vi.fn(),
    extractTemplateVariables: vi.fn(() => []),
    extractTemplateButtons: vi.fn(() => []),
    activeClient: { id: 1 },
};

let currentStep = 1;

vi.mock('./BulkSender/hooks/useBulkSender', () => ({
    useBulkSender: vi.fn(() => ({ ...mockBulkBase, step: currentStep }))
}));

vi.mock('./BulkSender/common/BulkGuideModal', () => ({ default: () => <div data-testid="guide-modal" /> }));
vi.mock('./BulkSender/common/ProcessingModal', () => ({ default: () => <div data-testid="processing-modal" /> }));
vi.mock('./BulkSender/common/ExpandTextModal', () => ({ default: () => <div data-testid="expand-modal" /> }));
vi.mock('./BulkSender/steps/ConfigurationStep', () => ({
    default: ({ setStep }) => <button data-testid="advance-btn" onClick={() => setStep(2)}>Avançar</button>
}));
vi.mock('./BulkSender/steps/ExecutionStep', () => ({ default: () => <div data-testid="execution-step" /> }));
vi.mock('react-hot-toast', () => ({
    toast: { success: vi.fn(), error: vi.fn(), custom: vi.fn() },
    Toaster: () => null
}));

describe('TemplateBulkSender - Scroll ao Topo ao Mudar de Step', () => {
    let mockScrollTo;
    let mockMainEl;

    beforeEach(() => {
        currentStep = 1;
        mockScrollTo = vi.fn();
        mockMainEl = { scrollTo: mockScrollTo };
        vi.spyOn(Element.prototype, 'closest').mockImplementation((selector) => {
            if (selector === 'main') return mockMainEl;
            return null;
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('deve renderizar o ConfigurationStep no step 1', () => {
        currentStep = 1;
        render(<TemplateBulkSender />);
        expect(screen.getByTestId('advance-btn')).toBeTruthy();
    });

    it('deve renderizar o ExecutionStep no step 2', () => {
        currentStep = 2;
        render(<TemplateBulkSender />);
        expect(screen.getByTestId('execution-step')).toBeTruthy();
    });

    it('deve chamar scrollTo no elemento <main> quando o step muda para 2', async () => {
        const { useBulkSender } = await import('./BulkSender/hooks/useBulkSender');

        currentStep = 1;
        vi.mocked(useBulkSender).mockReturnValue({ ...mockBulkBase, step: 1 });

        const { rerender } = render(<TemplateBulkSender />);

        // Muda o step para 2
        currentStep = 2;
        vi.mocked(useBulkSender).mockReturnValue({ ...mockBulkBase, step: 2 });

        await act(async () => {
            rerender(<TemplateBulkSender />);
        });

        expect(mockScrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
    });

    it('deve chamar window.scrollTo como fallback quando não há <main>', async () => {
        vi.spyOn(Element.prototype, 'closest').mockReturnValue(null);
        const mockWindowScrollTo = vi.fn();
        vi.stubGlobal('scrollTo', mockWindowScrollTo);

        const { useBulkSender } = await import('./BulkSender/hooks/useBulkSender');

        currentStep = 1;
        vi.mocked(useBulkSender).mockReturnValue({ ...mockBulkBase, step: 1 });

        const { rerender } = render(<TemplateBulkSender />);

        currentStep = 2;
        vi.mocked(useBulkSender).mockReturnValue({ ...mockBulkBase, step: 2 });

        await act(async () => {
            rerender(<TemplateBulkSender />);
        });

        expect(mockWindowScrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });

        vi.unstubAllGlobals();
    });
});
