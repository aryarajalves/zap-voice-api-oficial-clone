import React from 'react';
import UserFilters from './components/UserFilters';
import UserTable from './components/UserTable';
import UserModal from './components/UserModal';
import InvitationTable from './components/InvitationTable';
import ProjectManager from './components/ProjectManager';
import UsersHeader from './components/UsersHeader';
import UsersDeleteModals from './components/UsersDeleteModals';
import { useUsersManager } from './hooks/useUsersManager';

const Users = () => {
    const {
        currentUser,
        users,
        clients,
        invitations,
        loading,
        activeTab,
        setActiveTab,
        isModalOpen,
        setIsModalOpen,
        isDeleteModalOpen,
        setIsDeleteModalOpen,
        isDeleteInviteModalOpen,
        setIsDeleteInviteModalOpen,
        userToDelete,
        setUserToDelete,
        setInviteToDelete,
        editingUser,
        showPassword,
        setShowPassword,
        searchTerm,
        setSearchTerm,
        roleFilter,
        setRoleFilter,
        userCurrentPage,
        setUserCurrentPage,
        userItemsPerPage,
        setUserItemsPerPage,
        inviteCurrentPage,
        setInviteCurrentPage,
        inviteItemsPerPage,
        setInviteItemsPerPage,
        userData,
        setUserData,
        filteredUsers,
        fetchClients,
        fetchInvitations,
        handleOpenCreateModal,
        handleOpenEditModal,
        toggleClientAccess,
        handleSubmit,
        confirmDeleteUser,
        handleDeleteUser,
        confirmDeleteInvitation,
        handleDeleteInvitation
    } = useUsersManager();

    return (
        <div className="space-y-6">
            <UsersHeader
                currentUser={currentUser}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                onOpenCreateModal={handleOpenCreateModal}
            />

            {activeTab === 'users' ? (
                <>
                    <UserFilters 
                        searchTerm={searchTerm} 
                        setSearchTerm={setSearchTerm} 
                        roleFilter={roleFilter} 
                        setRoleFilter={setRoleFilter} 
                    />

                    {loading ? (
                        <div className="flex justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    ) : (
                        <UserTable 
                            users={filteredUsers} 
                            handleOpenEditModal={handleOpenEditModal} 
                            confirmDeleteUser={confirmDeleteUser}
                            currentPage={userCurrentPage}
                            setCurrentPage={setUserCurrentPage}
                            itemsPerPage={userItemsPerPage}
                            setItemsPerPage={setUserItemsPerPage}
                        />
                    )}
                </>
            ) : activeTab === 'invitations' ? (
                <>
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    ) : (
                        <InvitationTable
                            invitations={invitations}
                            clients={clients}
                            confirmDeleteInvitation={confirmDeleteInvitation}
                            currentPage={inviteCurrentPage}
                            setCurrentPage={setInviteCurrentPage}
                            itemsPerPage={inviteItemsPerPage}
                            setItemsPerPage={setInviteItemsPerPage}
                        />
                    )}
                </>
            ) : (
                <ProjectManager 
                    currentUser={currentUser} 
                    clients={clients} 
                    fetchClients={fetchClients} 
                />
            )}

            <UserModal 
                isOpen={isModalOpen}
                setIsOpen={setIsModalOpen}
                editingUser={editingUser}
                userData={userData}
                setUserData={setUserData}
                handleSubmit={handleSubmit}
                showPassword={showPassword}
                setShowPassword={setShowPassword}
                clients={clients}
                toggleClientAccess={toggleClientAccess}
                onInviteGenerated={fetchInvitations}
            />

            <UsersDeleteModals
                isDeleteModalOpen={isDeleteModalOpen}
                onCloseDeleteUser={() => {
                    setIsDeleteModalOpen(false);
                    setUserToDelete(null);
                }}
                onConfirmDeleteUser={handleDeleteUser}
                userToDelete={userToDelete}
                isDeleteInviteModalOpen={isDeleteInviteModalOpen}
                onCloseDeleteInvite={() => {
                    setIsDeleteInviteModalOpen(false);
                    setInviteToDelete(null);
                }}
                onConfirmDeleteInvite={handleDeleteInvitation}
            />
        </div>
    );
};

export default Users;
