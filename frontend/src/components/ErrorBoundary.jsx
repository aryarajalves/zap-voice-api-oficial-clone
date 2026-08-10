import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("ErrorBoundary capturou um erro de renderização:", error, errorInfo);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
        if (this.props.onReset) this.props.onReset();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="p-4 m-2 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 rounded-2xl flex flex-col items-center justify-center text-center gap-3 shadow-lg">
                    <div className="text-2xl">⚠️</div>
                    <h4 className="text-sm font-black text-rose-700 dark:text-rose-400">Ocorreu um erro ao carregar este componente.</h4>
                    <p className="text-xs text-rose-600 dark:text-rose-300 max-w-md font-mono bg-rose-100/50 dark:bg-rose-900/30 p-2 rounded-lg break-all">
                        {this.state.error?.message || 'Erro inesperado de renderização'}
                    </p>
                    <button
                        onClick={this.handleReset}
                        className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
                    >
                        Tentar Novamente
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
