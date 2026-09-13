import React from 'react';
import { createPortal } from 'react-dom';

// Hook de Lógica Customizada
import { useUserModalLogic } from './UserModal/useUserModalLogic';

// Subcomponentes Modulares
import UserModalHeader from './UserModal/UserModalHeader';
import InviteSuccessView from './UserModal/InviteSuccessView';
import UserBasicInfoSection from './UserModal/UserBasicInfoSection';
import UserRoleAndPermissionsSection from './UserModal/UserRoleAndPermissionsSection';
import UserClientsAccessSection from './UserModal/UserClientsAccessSection';
import UserSetupStatusSection from './UserModal/UserSetupStatusSection';
import UserModalFooter from './UserModal/UserModalFooter';

const UserModal = ({ 
  isOpen, 
  setIsOpen, 
  editingUser, 
  userData, 
  setUserData, 
  handleSubmit, 
  showPassword, 
  setShowPassword, 
  clients, 
  toggleClientAccess,
  onInviteGenerated
}) => {
  const {
    validityHours,
    setValidityHours,
    generatedLink,
    isGenerating,
    copied,
    resetLink,
    resetCopied,
    isGeneratingReset,
    handleGenerateInvite,
    handleCopyLink,
    handleGenerateResetLink,
    handleCopyResetLink,
    handleClose
  } = useUserModalLogic({
    userData,
    setUserData,
    editingUser,
    onInviteGenerated,
    setIsOpen
  });

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#1e293b] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-200 dark:border-white/5 max-h-[90vh] flex flex-col">
        {/* Header do Modal */}
        <UserModalHeader
          editingUser={editingUser}
          onClose={handleClose}
        />

        {generatedLink ? (
          <InviteSuccessView
            generatedLink={generatedLink}
            copied={copied}
            onCopyLink={handleCopyLink}
            onClose={handleClose}
          />
        ) : (
          <form 
            onSubmit={editingUser ? handleSubmit : handleGenerateInvite} 
            className="p-6 space-y-5 overflow-y-auto custom-scrollbar" 
            autoComplete="off"
          >
            {/* Hidden inputs to trick browsers */}
            <input type="text" style={{ display: 'none' }} />
            <input type="password" style={{ display: 'none' }} />

            {/* Informações Básicas / Redefinição de Senha ou Validade */}
            <UserBasicInfoSection
              editingUser={editingUser}
              userData={userData}
              setUserData={setUserData}
              validityHours={validityHours}
              setValidityHours={setValidityHours}
              resetLink={resetLink}
              resetCopied={resetCopied}
              isGeneratingReset={isGeneratingReset}
              onGenerateResetLink={handleGenerateResetLink}
              onCopyResetLink={handleCopyResetLink}
            />

            {/* Cargo, Banner do Vendedor, Painéis e Peso */}
            <UserRoleAndPermissionsSection
              userData={userData}
              setUserData={setUserData}
              editingUser={editingUser}
            />

            {/* Seleção de Clientes */}
            <UserClientsAccessSection
              clients={clients}
              userData={userData}
              toggleClientAccess={toggleClientAccess}
            />

            {/* Usuário Ativo */}
            {editingUser && (
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    disabled={editingUser?.role === 'super_admin'}
                    checked={userData.is_active}
                    onChange={(e) => setUserData({ ...userData, is_active: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 transition-all cursor-pointer"
                  />
                  <label htmlFor="is_active" className="text-sm font-bold text-gray-700 dark:text-gray-300 cursor-pointer">
                    Usuário Ativo
                  </label>
                </div>
              </div>
            )}

            {/* Status de Finalização da Configuração */}
            {editingUser && (
              <UserSetupStatusSection userData={userData} setUserData={setUserData} />
            )}

            {/* Ações do Modal */}
            <UserModalFooter
              editingUser={editingUser}
              isGenerating={isGenerating}
              onClose={handleClose}
            />
          </form>
        )}
      </div>
    </div>,
    document.body
  );
};

export default UserModal;
