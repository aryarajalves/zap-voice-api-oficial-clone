import React from 'react';
import { FiUpload } from 'react-icons/fi';

export default function FileUpload({ handleFileUpload }) {
    return (
        <div className="space-y-4 animate-in fade-in duration-300">
            <div className="border-2 border-dashed border-white/10 rounded-2xl p-12 text-center hover:bg-white/5 transition cursor-pointer relative group">
                <input
                    type="file"
                    accept=".csv,.txt,.xlsx,.xls"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center">
                    <div className="w-16 h-16 bg-white/5 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-inner">
                        <FiUpload className="text-gray-400 group-hover:text-red-500 transition-colors" size={32} />
                    </div>
                    <p className="text-base font-bold text-gray-700 dark:text-gray-200">Clique para upload ou arraste o arquivo CSV/Excel</p>
                    <p className="text-sm text-gray-400 mt-2">O sistema permitirá escolher a coluna após o upload</p>
                </div>
            </div>
        </div>
    );
}
