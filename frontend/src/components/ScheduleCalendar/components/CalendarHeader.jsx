import React from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

const CalendarHeader = ({ currentDate, eventsCount, loading, handlePrevMonth, handleNextMonth, setCurrentDate }) => {
    return (
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white capitalize">
                    {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                    <span className="text-sm font-normal text-gray-500 ml-2">({eventsCount})</span>
                </h2>
                {loading && <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full ml-3" data-testid="loading-spinner"></div>}
            </div>
            <div className="flex gap-2">
                <button 
                    onClick={handlePrevMonth} 
                    className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300 transition"
                    aria-label="Mês anterior"
                >
                    <FiChevronLeft />
                </button>
                <button 
                    onClick={() => setCurrentDate(new Date())} 
                    className="px-3 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                    Hoje
                </button>
                <button 
                    onClick={handleNextMonth} 
                    className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300 transition"
                    aria-label="Próximo mês"
                >
                    <FiChevronRight />
                </button>
            </div>
        </div>
    );
};

export default CalendarHeader;
