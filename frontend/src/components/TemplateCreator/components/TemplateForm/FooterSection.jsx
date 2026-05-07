import React from 'react';

const FooterSection = ({ logic }) => {
    const { formData, setFormData } = logic;

    return (
        <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Rodapé (Opcional)</label>
            <input
                type="text"
                value={formData.footer_text}
                onChange={(e) => setFormData({ ...formData, footer_text: e.target.value })}
                className="w-full p-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                placeholder="Texto cinza pequeno ao final..."
                maxLength={60}
            />
        </div>
    );
};

export default FooterSection;
