import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    ColumnSelectorHeader,
    Step1ColumnMapping,
    Step2SaveLeads,
    validateStep1,
    validateStep2
} from './ColumnSelectorModal/index.js';

const ColumnSelectorModal = ({
    isVisible,
    csvData,
    columnMapping,
    setColumnMapping,
    templateVariables,
    onConfirm,
    onClose,
    availableTags = [],
    saveLeadsTags = '',
    setSaveLeadsTags,
    isSaveTagsDropdownOpen = false,
    setIsSaveTagsDropdownOpen,
    saveTagsSearch = '',
    setSaveTagsSearch,
    toggleSaveLeadsTag,
    nameColumn = '',
    setNameColumn,
    emailColumn = '',
    setEmailColumn
}) => {
    const [step, setStep] = useState(1);

    useEffect(() => {
        if (isVisible) {
            setStep(1);
        }
    }, [isVisible]);

    if (!isVisible) return null;

    const handleSelect = (idx, val) => {
        setColumnMapping(prev => {
            const next = { ...prev };
            if (val !== 'ignore') {
                Object.keys(next).forEach(k => {
                    if (k !== String(idx) && next[k] === val) next[k] = 'ignore';
                });
            }
            next[String(idx)] = val;
            return next;
        });
    };

    const handleNextStep = () => {
        if (validateStep1(columnMapping, csvData)) {
            setStep(2);
        }
    };

    const handleConfirm = (shouldSaveToLeads) => {
        if (shouldSaveToLeads) {
            if (!validateStep2(nameColumn, emailColumn, csvData)) {
                return;
            }
        }
        onConfirm(shouldSaveToLeads);
    };

    return createPortal(
        <div className="fixed inset-0 z-[10000] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="bg-[#0d1117] w-full max-w-2xl rounded-[2rem] border border-white/8 shadow-2xl flex flex-col relative">
                <ColumnSelectorHeader step={step} onClose={onClose} />

                {step === 1 && (
                    <Step1ColumnMapping
                        csvData={csvData}
                        columnMapping={columnMapping}
                        templateVariables={templateVariables}
                        onSelect={handleSelect}
                        onClear={() => setColumnMapping({})}
                        onContinue={handleNextStep}
                    />
                )}

                {step === 2 && (
                    <Step2SaveLeads
                        csvData={csvData}
                        nameColumn={nameColumn}
                        setNameColumn={setNameColumn}
                        emailColumn={emailColumn}
                        setEmailColumn={setEmailColumn}
                        availableTags={availableTags}
                        saveLeadsTags={saveLeadsTags}
                        isSaveTagsDropdownOpen={isSaveTagsDropdownOpen}
                        setIsSaveTagsDropdownOpen={setIsSaveTagsDropdownOpen}
                        saveTagsSearch={saveTagsSearch}
                        setSaveTagsSearch={setSaveTagsSearch}
                        toggleSaveLeadsTag={toggleSaveLeadsTag}
                        onBack={() => setStep(1)}
                        onConfirm={handleConfirm}
                    />
                )}
            </div>
        </div>,
        document.body
    );
};

export default ColumnSelectorModal;
