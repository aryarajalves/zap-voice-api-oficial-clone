import React, { useState } from 'react';
import { FiTag } from 'react-icons/fi';
import ConversationLabelsModal from '../Modals/ConversationLabelsModal';

export default function ConversationLabelsList({
    labels = [],
    getLabelColor,
    contactName = '',
    variant = 'card', // 'card' | 'header'
    className = ''
}) {
    const [isModalOpen, setIsModalOpen] = useState(false);

    if (!labels || labels.length === 0) return null;

    const maxVisible = 3;
    const hasMore = labels.length > maxVisible;
    const visibleLabels = hasMore ? labels.slice(0, maxVisible) : labels;
    const remainingCount = labels.length - maxVisible;

    const resolveColor = (label) => {
        if (typeof getLabelColor === 'function') {
            return getLabelColor(label);
        }
        return '#3B82F6';
    };

    const handleOpenModal = (e) => {
        e.stopPropagation();
        e.preventDefault();
        setIsModalOpen(true);
    };

    const isHeader = variant === 'header';

    return (
        <>
            <div className={`flex flex-wrap items-center gap-1 ${className}`}>
                {visibleLabels.map((label, idx) => {
                    const color = resolveColor(label);
                    if (isHeader) {
                        return (
                            <span
                                key={`${label}-${idx}`}
                                style={{
                                    color: color,
                                    borderColor: `${color}40`,
                                    backgroundColor: `${color}18`
                                }}
                                className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border shadow-xs"
                            >
                                <FiTag size={10} />
                                <span>{label}</span>
                            </span>
                        );
                    }

                    return (
                        <span
                            key={`${label}-${idx}`}
                            style={{
                                color: color,
                                borderColor: `${color}33`,
                                backgroundColor: `${color}15`
                            }}
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded border"
                        >
                            {label} <span className="opacity-70 font-normal">({label ? label.length : 0})</span>
                        </span>
                    );
                })}

                {hasMore && (
                    <button
                        type="button"
                        onClick={handleOpenModal}
                        title={`Ver todas as ${labels.length} etiquetas (+${remainingCount} restante${remainingCount > 1 ? 's' : ''})`}
                        className={`inline-flex items-center justify-center font-bold rounded cursor-pointer transition border border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 hover:text-blue-300 shadow-xs ${
                            isHeader
                                ? 'text-[10px] px-2 py-0.5 rounded-md'
                                : 'text-[9px] px-1.5 py-0.5 rounded'
                        }`}
                        data-testid="btn-show-more-labels"
                    >
                        +{remainingCount}
                    </button>
                )}
            </div>

            <ConversationLabelsModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                contactName={contactName}
                labels={labels}
                getLabelColor={getLabelColor}
            />
        </>
    );
}
