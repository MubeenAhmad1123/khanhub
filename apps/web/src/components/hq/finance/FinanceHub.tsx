'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3, 
  ChevronRight, 
  Droplet, 
  Layers, 
  LayoutDashboard, 
  LayoutGrid, 
  Maximize2, 
  Minus, 
  Plus, 
  Rocket, 
  Search, 
  ShieldCheck, 
  Sparkles, 
  TrendingUp, 
  Zap 
} from 'lucide-react';
import { DeptBreakdown, fetchFinanceHubData } from '@/lib/hq/superadmin/finance';
import { DeptHubNode } from './DeptHubNode';
import { FinancePipesOverlay } from './FinancePipes';
import { FinanceDrillDown } from './FinanceDrillDown';
import { cn } from '@/lib/utils';

interface FinanceHubProps {
  departments: DeptBreakdown[];
  onUpdate: () => Promise<void>;
}

export const FinanceHub: React.FC<FinanceHubProps> = ({ departments: data, onUpdate: loadData }) => {
  const [selectedDept, setSelectedDept] = React.useState<DeptBreakdown | null>(null);
  const [viewMode, setViewMode] = React.useState<'hub' | 'grid'>('hub');
  
  const centerRef = React.useRef<HTMLDivElement>(null);
  const deptRefs = React.useRef<Record<string, React.RefObject<HTMLDivElement>>>({});
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    data.forEach(d => {
      if (!deptRefs.current[d.deptId]) {
        deptRefs.current[d.deptId] = React.createRef<HTMLDivElement>();
      }
    });
  }, [data]);

  React.useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const totalToday = data.reduce((acc, d) => acc + d.totalIncome, 0);

  if (loading && data.length === 0) {
    return <FinanceHubSkeleton />;
  }

  return (
    <div className="relative min-h-[700px] w-full bg-grid-white/[0.02] rounded-[3rem] overflow-hidden border border-border/50 shadow-inner p-8 bg-white dark:bg-black">
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 blur-[120px] rounded-full animate-pulse delay-1000" />
      </div>

      <div className="absolute top-8 left-8 z-50 flex items-center gap-4">
        <div className="flex bg-background/80 backdrop-blur-xl p-1.5 rounded-2xl border border-border/50 shadow-2xl">
          <button 
            onClick={() => setViewMode('hub')}
            className={cn(
              "rounded-xl h-10 px-6 font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all",
              viewMode === 'hub' ? "bg-black text-white dark:bg-white dark:text-black shadow-lg" : "text-muted-foreground hover:bg-muted"
            )}
          >
            <Layers className="w-4 h-4" /> Data Hub
          </button>
          <button 
            onClick={() => setViewMode('grid')}
            className={cn(
              "rounded-xl h-10 px-6 font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all",
              viewMode === 'grid' ? "bg-black text-white dark:bg-white dark:text-black shadow-lg" : "text-muted-foreground hover:bg-muted"
            )}
          >
            <LayoutGrid className="w-4 h-4" /> Overview
          </button>
        </div>
      </div>

      <div className="absolute top-8 right-8 z-50">
         <button 
           onClick={loadData}
           className="rounded-2xl bg-background/80 backdrop-blur-xl h-12 px-6 border-2 border-primary/20 hover:border-primary/50 transition-all flex items-center gap-2 font-black text-[10px] uppercase tracking-widest group shadow-2xl"
         >
           <TrendingUp className="w-4 h-4 text-emerald-500 group-hover:scale-125 transition-transform" />
           Sync Ledger
         </button>
      </div>

      <div className="relative h-full flex flex-col items-center justify-center py-20">
        {viewMode === 'hub' ? (
          <div className="relative w-full h-[600px] flex items-center justify-center">
             {!loading && (
               <FinancePipesOverlay 
                sourceRefs={deptRefs.current} 
                targetRef={centerRef} 
                depts={data.map(d => d.deptId)} 
               />
             )}

             <motion.div
               ref={centerRef}
               initial={{ scale: 0.8, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               className="relative z-20 group"
             >
                <div className="absolute -inset-20 bg-primary/20 blur-[100px] rounded-full group-hover:bg-primary/30 transition-all duration-700" />
                
                <div className="w-80 h-80 rounded-full flex flex-col items-center justify-center p-8 bg-background/90 backdrop-blur-3xl border-[4px] border-primary/30 shadow-[0_0_80px_rgba(59,130,246,0.2)] group-hover:shadow-[0_0_120px_rgba(59,130,246,0.4)] transition-all duration-700 relative overflow-hidden">
                   <div className="absolute inset-0 border border-primary/5 rounded-full animate-[spin_10s_linear_infinite]" />
                   <div className="absolute inset-8 border border-dashed border-primary/10 rounded-full animate-[spin_15s_linear_infinite_reverse]" />
                   
                   <div className="text-primary/60 font-black text-[11px] uppercase tracking-[0.4em] mb-4 flex items-center gap-2">
                     <Sparkles className="w-3.5 h-3.5" /> Core Inflow
                   </div>
                   
                   <div className="text-5xl font-black tracking-tighter text-center leading-none text-black dark:text-white">
                     <span className="text-[10px] font-black text-muted-foreground block mb-2 opacity-50">RS. TOTAL</span>
                     {totalToday.toLocaleString()}
                   </div>

                   <div className="mt-8 flex flex-col items-center gap-2">
                      <div className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-5 py-2 rounded-full border border-emerald-500/20 uppercase tracking-[0.2em] shadow-sm">
                        +12.4% Optimal
                      </div>
                      <div className="text-[10px] font-black text-muted-foreground mt-1 opacity-40 uppercase tracking-widest">
                         Unified Global Nexus
                      </div>
                   </div>

                   <motion.div 
                     animate={{ y: [0, 400, 0] }}
                     transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                     className="absolute w-full h-40 bg-gradient-to-b from-transparent via-primary/10 to-transparent left-0 pointer-events-none"
                   />
                </div>

                <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 whitespace-nowrap">
                   <div className="flex items-center gap-4 bg-background/80 backdrop-blur-xl px-8 py-4 rounded-3xl border border-border/50 text-[10px] font-black shadow-2xl uppercase tracking-widest">
                     <div className="flex -space-x-2">
                       {[1,2,3,4].map(i => (
                         <div key={i} className="w-5 h-5 rounded-full bg-black dark:bg-white text-white dark:text-black border-2 border-background flex items-center justify-center text-[8px] font-black ring-2 ring-primary/10">
                           {i}
                         </div>
                       ))}
                     </div>
                     <span className="text-muted-foreground">4 Active Decision Terminals</span>
                   </div>
                </div>
             </motion.div>

             <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center pointer-events-none">
                {data.map((dept, idx) => {
                  const angle = (idx * (360 / data.length) - 90) * (Math.PI / 180);
                  const radius = 320;
                  const x = Math.cos(angle) * radius;
                  const y = Math.sin(angle) * radius;

                  return (
                    <div 
                      key={dept.deptId}
                      className="absolute pointer-events-auto"
                      style={{ transform: `translate(${x}px, ${y}px)` }}
                    >
                      <DeptHubNode 
                        dept={dept} 
                        innerRef={deptRefs.current[dept.deptId]}
                        onClick={(d) => setSelectedDept(d)} 
                      />
                    </div>
                  );
                })}
             </div>
          </div>
        ) : (
          <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 p-4">
             {data.map((dept) => (
               <DeptHubNode 
                 key={dept.deptId} 
                 dept={dept}
                 innerRef={deptRefs.current[dept.deptId]}
                 onClick={(d) => setSelectedDept(d)}
               />
             ))}
          </div>
        )}
      </div>

      <div className="absolute bottom-0 left-0 p-12 w-full flex justify-between items-end pointer-events-none">
        <div className="text-[10px] font-mono tracking-[0.4em] text-muted-foreground/20 leading-[2] uppercase">
          SYSTEM_ID: KHANHUB_FIN_V4<br/>
          ACCESS: LEVEL_0_SUPERADMIN<br/>
          STATUS: GLOBAL_LEDGER_SYNCED
        </div>
        <div className="flex gap-2">
           {[...Array(15)].map((_, i) => (
             <div key={i} className="w-1 bg-primary/10 rounded-full" style={{ height: `${Math.random() * 60 + 20}px` }} />
           ))}
        </div>
      </div>

      <FinanceDrillDown 
        dept={selectedDept} 
        onClose={() => setSelectedDept(null)} 
        onUpdate={loadData}
      />
    </div>
  );
};

const FinanceHubSkeleton = () => (
  <div className="w-full h-[700px] border border-border/50 rounded-[3rem] bg-muted/10 animate-pulse flex items-center justify-center overflow-hidden">
     <div className="relative">
       <div className="w-80 h-80 rounded-full border-[8px] border-muted/20 flex items-center justify-center">
         <div className="w-40 h-12 rounded-2xl bg-muted/40" />
       </div>
       {[0, 90, 180, 270].map(angle => (
         <div 
           key={angle}
           className="absolute w-56 h-40 rounded-[2rem] border-2 border-muted/20 bg-muted/10"
           style={{ 
             transform: `translate(${Math.cos(angle * Math.PI / 180) * 320}px, ${Math.sin(angle * Math.PI / 180) * 320}px) translate(-50%, -50%)`,
             top: '50%',
             left: '50%'
           }}
         />
       ))}
     </div>
  </div>
);
