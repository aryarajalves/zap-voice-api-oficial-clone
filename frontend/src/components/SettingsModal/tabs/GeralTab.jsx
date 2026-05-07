import { FiTrash2, FiImage, FiUpload, FiEyeOff, FiEye } from 'react-icons/fi';
import { resolveUrl } from '../../../config';

const GeralTab = ({ 
    user, formData, handleChange, handleLogoUpload, isUploading, setFormData, 
    profileData, handleProfileChange, showPassword, setShowPassword 
}) => {
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* General Section */}
            {user?.role !== 'user' && (user?.role !== 'premium') && (
                <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-white/5">
                        <span className="text-purple-600">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                            </svg>
                        </span>
                        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Geral</h3>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Nome do Cliente</label>
                            <input
                                type="text"
                                name="CLIENT_NAME"
                                value={formData.CLIENT_NAME || ''}
                                onChange={handleChange}
                                placeholder="Ex: Empresa XYZ"
                                className="w-full p-2.5 border border-gray-100 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all bg-white dark:bg-[#1f2937]/50 text-gray-900 dark:text-white"
                                autoComplete="off"
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400">Exibido no topo da tela inicial.</p>
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Nome da Empresa (White Label)</label>
                            <input
                                type="text"
                                name="APP_NAME"
                                value={formData.APP_NAME || ''}
                                onChange={handleChange}
                                maxLength={35}
                                placeholder="Ex: Minha Empresa"
                                className="w-full p-2.5 border border-gray-100 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all bg-white dark:bg-[#1f2937]/50 text-gray-900 dark:text-white"
                            />
                            <div className="flex justify-between mt-1">
                                <p className="text-xs text-gray-500 dark:text-gray-400">Substitui o nome "ZapVoice" no sistema.</p>
                                <span className={`text-[10px] ${(formData.APP_NAME?.length || 0) >= 35 ? 'text-red-500 font-bold' : 'text-gray-400'}`}>
                                    {formData.APP_NAME?.length || 0}/35
                                </span>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Logo do App (White Label)</label>

                            <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-[#1f2937]/50/30 rounded-xl border border-dashed border-gray-300 dark:border-white/10">
                                <div className="flex flex-col items-center gap-2">
                                    {formData.APP_LOGO ? (
                                        <div className="relative group w-20 h-20 bg-white dark:bg-[#1f2937]/80 rounded-lg overflow-hidden border border-gray-200 dark:border-white/5 shadow-sm">
                                            <img src={resolveUrl(formData.APP_LOGO)} alt="App Logo" className="w-full h-full object-cover" />
                                            <button
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, APP_LOGO: '' }))}
                                                className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white"
                                                title="Remover logo"
                                            >
                                                <FiTrash2 size={20} />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="w-20 h-20 bg-gray-100 dark:bg-[#1f2937]/80 rounded-lg flex items-center justify-center text-gray-400 border border-gray-200 dark:border-white/5 border-dashed">
                                            <FiImage size={32} />
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1 space-y-3">
                                    <div className="flex flex-col gap-2">
                                        <label className="relative cursor-pointer bg-white dark:bg-[#1f2937]/80 border border-gray-300 dark:border-white/10 rounded-lg px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm transition-all flex items-center justify-center gap-2 group">
                                            <FiUpload className="group-hover:translate-y-[-1px] transition-transform" />
                                            <span>{formData.APP_LOGO ? 'Alterar Logo' : 'Fazer Upload da Logo'}</span>
                                            <input
                                                type="file"
                                                className="hidden"
                                                accept="image/*"
                                                onChange={handleLogoUpload}
                                                disabled={isUploading}
                                            />
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                name="APP_LOGO"
                                                value={formData.APP_LOGO || ''}
                                                onChange={handleChange}
                                                placeholder="Ou cole a URL da logo aqui..."
                                                className="w-full p-2 text-xs border border-gray-200 dark:border-white/5 rounded bg-white dark:bg-[#1f2937]/80 text-gray-600 dark:text-gray-400 outline-none focus:ring-1 focus:ring-purple-500"
                                            />
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-gray-500 dark:text-gray-400">Recomendado: Imagem quadrada (PNG ou JPEG), máx 2MB.</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Tamanho da Logo</label>
                            <select
                                name="APP_LOGO_SIZE"
                                value={formData.APP_LOGO_SIZE || 'medium'}
                                onChange={handleChange}
                                className="w-full p-2.5 border border-gray-100 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none transition-all bg-white dark:bg-[#1f2937]/50 text-gray-900 dark:text-white"
                            >
                                <option value="small">Pequena (32px)</option>
                                <option value="medium">Média (48px)</option>
                                <option value="large">Grande (64px)</option>
                                <option value="xlarge">Extra Grande (80px)</option>
                            </select>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Ajusta o tamanho da logo na barra lateral.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Personal Profile Section */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-white/5">
                    <span className="text-blue-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                        </svg>
                    </span>
                    <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Meu Perfil</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Meu Nome</label>
                        <input
                            type="text"
                            name="full_name"
                            value={profileData.full_name}
                            onChange={handleProfileChange}
                            placeholder="Seu nome real"
                            className="w-full p-2.5 border border-gray-100 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white dark:bg-[#1f2937]/50 text-gray-900 dark:text-white"
                            autoComplete="name"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Meu Email</label>
                        <input
                            type="email"
                            name="email"
                            value={profileData.email}
                            onChange={handleProfileChange}
                            placeholder="seu@email.com"
                            className="w-full p-2.5 border border-gray-100 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white dark:bg-[#1f2937]/50 text-gray-900 dark:text-white"
                            autoComplete="email"
                        />
                    </div>
                    <div className="space-y-1 md:col-span-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Nova Senha (deixe em branco para manter)</label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                name="password"
                                value={profileData.password}
                                onChange={handleProfileChange}
                                placeholder="••••••••"
                                className="w-full p-2.5 pr-10 border border-gray-100 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white dark:bg-[#1f2937]/50 text-gray-900 dark:text-white"
                                autoComplete="new-password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                                title={showPassword ? "Ocultar senha" : "Mostrar senha"}
                            >
                                {showPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GeralTab;
