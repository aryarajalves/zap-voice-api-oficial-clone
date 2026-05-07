import { useState } from 'react';

export const useTriggerModals = () => {
    // Modals states
    const [modalConfig, setModalConfig] = useState({
        isOpen: false,
        type: null, 
        id: null,
        title: '',
        message: '',
        confirmText: '',
        isDangerous: false
    });

    const [contactsModal, setContactsModal] = useState({
        isOpen: false,
        title: '',
        triggerId: null,
        contacts: [],
        counts: {}
    });

    const [editParamsModal, setEditParamsModal] = useState({
        isOpen: false,
        id: null,
        delay: 5,
        concurrency: 1,
        contacts: [],
        scheduledTime: ''
    });

    const [errorModal, setErrorModal] = useState({
        isOpen: false,
        triggerId: null,
        errors: [],
        isLoading: false
    });

    const [childrenModal, setChildrenModal] = useState({
        isOpen: false,
        triggerId: null,
        triggerName: '',
        children: [],
        isLoading: false
    });

    return {
        modalConfig, setModalConfig,
        contactsModal, setContactsModal,
        editParamsModal, setEditParamsModal,
        errorModal, setErrorModal,
        childrenModal, setChildrenModal
    };
};
