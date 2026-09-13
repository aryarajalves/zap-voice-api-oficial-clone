import React from 'react';
import ConfirmModal from '../../../components/ConfirmModal';

const UsersDeleteModals = ({
    isDeleteModalOpen,
    onCloseDeleteUser,
    onConfirmDeleteUser,
    userToDelete,
    isDeleteInviteModalOpen,
    onCloseDeleteInvite,
    onConfirmDeleteInvite
}) => {
    return (
        <>
            <ConfirmModal
                isOpen={isDeleteModalOpen}
                onClose={onCloseDeleteUser}
                onConfirm={onConfirmDeleteUser}
                title="Confirma a exclusão?"
                message={`Você está prestes a remover "${userToDelete?.full_name || userToDelete?.email}" do sistema. Esta ação é irreversível.`}
                confirmText="Sim, Excluir"
                isDangerous={true}
            />

            <ConfirmModal
                isOpen={isDeleteInviteModalOpen}
                onClose={onCloseDeleteInvite}
                onConfirm={onConfirmDeleteInvite}
                title="Revogar Link de Convite?"
                message="Você está prestes a revogar este link de convite. Ninguém poderá utilizá-lo para se cadastrar. Esta ação é irreversível."
                confirmText="Sim, Revogar"
                isDangerous={true}
            />
        </>
    );
};

export default UsersDeleteModals;
