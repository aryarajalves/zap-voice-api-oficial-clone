import React from 'react';

const TemplatePreview = ({ template, params = {} }) => {
    if (!template) return null;

    const renderHeader = () => {
        const header = template.components.find(c => c.type === 'HEADER');
        if (!header) return null;
        if (header.format === 'TEXT') {
            const text = header.text;
            const parts = text.split(/(\{\{1\}\})/g);
            // Header usually only has 1 variable {{1}} if any
            return (
                <div className="font-bold mb-3 text-white text-base">
                    {parts.map((part, i) => {
                        if (part.match(/\{\{\d+\}\}/)) {
                            const varIndex = part.replace(/\D/g, '');
                            const val = params[`HEADER_${parseInt(varIndex) - 1}`];
                            return <span key={i} className={val ? "text-white" : "text-green-400 bg-green-500/10 px-1 rounded"}>{val || part}</span>;
                        }
                        return part;
                    })}
                </div>
            );
        }
        if (header.format === 'IMAGE') return (
            <div className="h-40 bg-slate-800 rounded-lg mb-4 flex items-center justify-center text-slate-500 overflow-hidden relative group">
                <div className="absolute inset-0 bg-slate-800 flex items-center justify-center">
                    {params['HEADER_0'] ? (
                        <img src={params['HEADER_0']} alt="Header" className="w-full h-full object-cover" onError={(e) => e.target.style.display = 'none'} />
                    ) : (
                        <svg className="w-10 h-10 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    )}
                </div>
            </div>
        );
        if (header.format === 'VIDEO') return <div className="h-40 bg-slate-800 rounded-lg mb-4 flex items-center justify-center text-slate-500"><svg className="w-10 h-10 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>;
        return <div className="h-40 bg-slate-800 rounded-lg mb-4 flex items-center justify-center text-slate-500 text-xs font-mono">{header.format} HEADER</div>;
    };

    const renderBody = () => {
        const body = template.components.find(c => c.type === 'BODY');
        if (!body) return null;
        let text = body.text;
        const parts = text.split(/(\{\{\d+\}\})/g);
        return (
            <div className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
                {parts.map((part, i) => {
                    if (part.match(/\{\{\d+\}\}/)) {
                        const varIndex = part.replace(/\D/g, '');
                        const val = params[`BODY_${parseInt(varIndex) - 1}`];
                        return <span key={i} className={val ? "font-semibold text-white" : "text-green-400 font-bold bg-green-500/10 px-1 rounded"}>{val || part}</span>;
                    }
                    return part;
                })}
            </div>
        );
    };

    const renderFooter = () => {
        const footer = template.components.find(c => c.type === 'FOOTER');
        if (!footer) return null;
        return <div className="text-[10px] text-slate-500 mt-3 pt-3 border-t border-white/5">{footer.text}</div>;
    };

    const renderButtons = () => {
        const buttons = template.components.find(c => c.type === 'BUTTONS');
        if (!buttons) return null;
        return (
            <div className="mt-4 grid gap-2">
                {buttons.buttons.map((btn, i) => (
                    <div key={i} className="bg-slate-800 text-blue-400 text-center py-2.5 rounded-lg text-xs font-bold border border-white/5 shadow-sm hover:bg-slate-700/50 cursor-default transition-colors flex items-center justify-center gap-2">
                        {btn.type === 'PHONE_NUMBER' && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>}
                        {btn.type === 'URL' && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>}
                        {btn.text}
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="bg-[#0b141a] rounded-[2rem] p-6 border border-slate-800 w-full font-sans relative overflow-hidden shadow-2xl">
            {/* WhatsApp Chat Bubble Style */}
            <div className="absolute top-0 left-0 w-full h-1.5 bg-[#25D366]"></div>
            <div className="bg-[#1f2c34] p-3 rounded-lg rounded-tl-none shadow-sm relative">
                {/* Tail */}
                <svg className="absolute -left-2 top-0 text-[#1f2c34]" width="8" height="13" viewBox="0 0 8 13" fill="currentColor"><path d="M-2.28882e-07 -1.04222e-06L0 12.0003L8 0.500295L-2.28882e-07 -1.04222e-06Z" /></svg>

                {renderHeader()}
                {renderBody()}
                {renderFooter()}
            </div>
            {renderButtons()}

            <div className="mt-3 flex justify-end items-center gap-1 opacity-50 text-[10px] text-slate-400">
                <span>12:00</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-400"><path d="M20 6L9 17l-5-5" /></svg>
            </div>
        </div>
    );
};

export default TemplatePreview;
