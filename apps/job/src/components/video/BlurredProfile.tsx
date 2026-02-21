import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BlurredProfileProps {
    name: string;
    email: string;
    phone: string;
    location: string;
    className?: string;
}

export default function BlurredProfile({ name, email, phone, location, className }: BlurredProfileProps) {
    return (
        <div className={cn("relative p-6 bg-white rounded-2xl border border-slate-200 overflow-hidden", className)}>
            {/* Blurred Content */}
            <div className="space-y-4 filter blur-sm select-none pointer-events-none">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-slate-200" />
                    <div>
                        <div className="h-4 w-32 bg-slate-200 rounded mb-2" />
                        <div className="h-3 w-48 bg-slate-100 rounded" />
                    </div>
                </div>
                <div className="space-y-2">
                    <div className="h-3 w-full bg-slate-50 rounded" />
                    <div className="h-3 w-5/6 bg-slate-50 rounded" />
                </div>
            </div>

            {/* Lock Overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-white/40 backdrop-blur-[2px]">
                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                    <Lock className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-slate-900 font-bold mb-1">Contact Details Locked</h3>
                <p className="text-slate-500 text-sm mb-6 max-w-[200px]">
                    Pay PKR 1,000 to unlock candidate contact details
                </p>
                <button className="px-6 py-2.5 bg-[#F97316] hover:bg-[#EA580C] text-white rounded-full text-sm font-bold transition-all shadow-md">
                    Pay & Connect
                </button>
            </div>
        </div>
    );
}
