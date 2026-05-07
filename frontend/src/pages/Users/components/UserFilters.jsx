import React from 'react';
import { FiSearch, FiFilter } from 'react-icons/fi';

const UserFilters = ({ searchTerm, setSearchTerm, roleFilter, setRoleFilter }) => {
    return (
        <div className="flex flex-col md:flex-row gap-4 bg-white/50 dark:bg-[#1e293b]/50 p-4 rounded-xl border border-gray-200 dark:border-white/5">
            <div className="relative flex-1">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                    type="text"
                    placeholder="Buscar por nome ou email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-[#0b1120] border border-gray-200 dark:border-white/5 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white transition-all"
                />
            </div>
            <div className="flex items-center gap-2 min-w-[200px]">
                <FiFilter className="text-gray-400" />
                <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white transition-all text-sm font-medium"
                >
                    <option value="all">Todos os Cargos</option>
                    <option value="super_admin">Super Admin</option>
                    <option value="admin">Administrador</option>
                    <option value="premium">Usuário Premium</option>
                    <option value="user">Usuário Comum</option>
                </select>
            </div>
        </div>
    );
};

export default UserFilters;
