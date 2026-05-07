import React from 'react';
import { FiInfo } from 'react-icons/fi';

const BasicInfo = ({ logic }) => {
    const { formData, setFormData, editingId } = logic;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                    Nome do Template <FiInfo className="text-gray-400 cursor-help" title="Apenas minúsculas, números e _" />
                </label>
                <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value.toLowerCase().replace(/\s/g, '_') })}
                    className={`w-full p-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white ${editingId ? 'opacity-50 cursor-not-allowed' : ''}`}
                    placeholder="ex: promocao_natal_2024"
                    required
                    disabled={editingId !== null}
                />
            </div>
            <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Categoria</label>
                <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full p-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white cursor-pointer appearance-none"
                >
                    <option value="MARKETING" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Marketing (Promoções, Convites)</option>
                    <option value="UTILITY" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Utilidade (Alertas, Cobranças, Updates)</option>
                </select>
            </div>
        </div>
    );
};

export default BasicInfo;
