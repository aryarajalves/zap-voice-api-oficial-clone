import React from 'react';
import UserPanelsAccessSection from './UserPanelsAccessSection';
import UserFunnelNodesSection from './UserFunnelNodesSection';

const UserRoleAndPermissionsSection = ({
  userData,
  setUserData,
  editingUser
}) => {
  const handleRoleChange = (e) => {
    const nextRole = e.target.value;
    let defaultBlocked = [];
    if (nextRole === 'premium') {
      defaultBlocked = ['settings'];
    } else if (nextRole === 'user') {
      defaultBlocked = ['settings', 'schedules', 'funnels', 'leads'];
    } else if (nextRole === 'vendedor') {
      defaultBlocked = ['settings', 'schedules', 'funnels', 'leads', 'history', 'whatsapp', 'bulk_sender'];
    }
    setUserData({ ...userData, role: nextRole, blocked_features: defaultBlocked });
  };

  return (
    <>
      <div>
        <label className="block text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">
          Nível de Acesso (Cargo)
        </label>
        <select
          disabled={editingUser?.role === 'super_admin'}
          value={userData.role}
          onChange={handleRoleChange}
          className={`w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white outline-none font-medium ${editingUser?.role === 'super_admin' ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {editingUser?.role === 'super_admin' && (
            <option value="super_admin">Super Admin</option>
          )}
          <option value="admin">Administrador (Configurações Totais)</option>
          <option value="premium">Usuário Premium (Sem Configurações Avançadas)</option>
          <option value="user">Usuário (Histórico Apenas)</option>
          <option value="vendedor">Vendedor (Painel de Atendimento)</option>
        </select>
      </div>

      {/* Banner de Acesso do Cargo Vendedor */}
      {userData.role === 'vendedor' && (
        <div className="p-3 border border-blue-200 dark:border-blue-800/50 rounded-xl bg-blue-50/50 dark:bg-blue-900/20">
          <div className="flex items-start gap-2">
            <span className="text-blue-500 text-lg">🔒</span>
            <div>
              <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">Acesso restrito ao Painel de Atendimento</p>
              <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-0.5">
                O cargo <strong>Vendedor</strong> tem acesso exclusivo ao chat de atendimento. Todos os outros módulos ficam automaticamente bloqueados.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Painéis e Status de Construção */}
      {userData.role !== 'super_admin' && userData.role !== 'vendedor' && (
        <UserPanelsAccessSection userData={userData} setUserData={setUserData} />
      )}

      {/* Restrições de Nós do Funil */}
      {userData.role !== 'super_admin' && userData.role !== 'vendedor' && !(userData.blocked_features || []).includes('funnels') && (
        <UserFunnelNodesSection userData={userData} setUserData={setUserData} />
      )}

      {/* Peso do Vendedor */}
      {userData.role === 'vendedor' && (
        <div className="animate-in fade-in slide-in-from-top-1 duration-200">
          <label className="block text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">
            Pontuação do Vendedor (Peso de Distribuição)
          </label>
          <select
            value={userData.seller_weight || 1}
            onChange={(e) => setUserData({ ...userData, seller_weight: Number(e.target.value) })}
            className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white outline-none font-medium"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(val => (
              <option key={val} value={val}>{val} {val === 1 ? '(Normal)' : val === 10 ? '(Máximo)' : ''}</option>
            ))}
          </select>
          <p className="mt-1 text-[10px] text-gray-400 italic">
            Pesos maiores garantem proporcionalmente mais leads na distribuição (Rodízio/Aleatório).
          </p>
        </div>
      )}
    </>
  );
};

export default UserRoleAndPermissionsSection;
