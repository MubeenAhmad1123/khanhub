interface BlurredContentProps {
    children: React.ReactNode;
    isPremium: boolean;
    onUpgradeClick?: () => void;
}

export default function BlurredContent({ children, isPremium, onUpgradeClick }: BlurredContentProps) {
    if (isPremium) {
        return <>{children}</>;
    }

    return (
        <div className="relative">
            <div className="filter blur-sm select-none pointer-events-none">
                {children}
            </div>
            <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm">
                <div className="text-center p-6">
                    <div className="bg-jobs-accent p-3 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <p className="text-sm font-bold text-jobs-dark mb-2">Premium Content</p>
                    <p className="text-xs text-jobs-dark/60 mb-4 max-w-xs">
                        Upgrade to premium to see full company details
                    </p>
                    {onUpgradeClick && (
                        <button
                            onClick={onUpgradeClick}
                            className="bg-jobs-accent text-white px-6 py-2 rounded-xl font-bold text-sm hover:opacity-90 transition-all"
                        >
                            Upgrade Now
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
