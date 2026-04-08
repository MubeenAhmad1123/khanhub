// src/components/welfare/ScoreCard.tsx
import React from 'react';
import { MONTHLY_REWARDS, WEEKLY_RULE, TOTAL_MAX_SCORE, SCORE_CATEGORIES } from '@/data/scoreRules';
import { CalendarCheck, Shirt, CheckSquare, TrendingUp, Award, Gift } from 'lucide-react';
import { formatDateDMY } from '@/lib/utils';

interface ScoreCardProps {
  staffName: string;
  month: string;       // "YYYY-MM"
  scores: {
    attendance: number;
    uniform: number;
    working: number;
    growthPoint: number;
  };
  darkMode?: boolean;
}

const ICONS: Record<string, React.ReactNode> = {
  attendance: <CalendarCheck size={14} />,
  uniform: <Shirt size={14} />,
  working: <CheckSquare size={14} />,
  growthPoint: <TrendingUp size={14} />,
};

const COLORS: Record<string, string> = {
  blue: 'bg-blue-500',
  purple: 'bg-purple-500',
  teal: 'bg-teal-500',
  amber: 'bg-amber-500',
};

const TEXT_COLORS: Record<string, string> = {
  blue: 'text-blue-500',
  purple: 'text-purple-500',
  teal: 'text-teal-500',
  amber: 'text-amber-500',
};

export default function ScoreCard({ staffName, month, scores, darkMode = false }: ScoreCardProps) {
  const total = (scores.attendance || 0) + (scores.uniform || 0) + (scores.working || 0) + (scores.growthPoint || 0);
  const percentage = Math.round((total / TOTAL_MAX_SCORE) * 100);
  
  const reward = MONTHLY_REWARDS.find(r => total >= r.minScore) || MONTHLY_REWARDS[MONTHLY_REWARDS.length - 1];
  const weeklyEligible = total >= WEEKLY_RULE.minScore;

  // Format month as DD MM YYYY ("01 MM YYYY")
  const formattedMonth = formatDateDMY(new Date(`${month}-01`));

  // Circle progress calculation
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className={`p-6 rounded-[2.5rem] shadow-sm border flex flex-col items-center relative overflow-hidden transition-colors ${
      darkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-gray-100'
    }`}>
      {/* Header */}
      <div className="w-full text-center mb-6 z-10 relative">
        <h3 className={`text-lg font-black ${darkMode ? 'text-white' : 'text-gray-900'}`}>{staffName}</h3>
        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-1">{formattedMonth}</p>
      </div>

      {/* Progress Ring */}
      <div className="relative w-32 h-32 mb-8 flex items-center justify-center">
        {/* Background Circle */}
        <svg className="w-full h-full transform -rotate-90 absolute" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="transparent"
            className={darkMode ? 'stroke-zinc-800' : 'stroke-gray-100'}
            strokeWidth="8"
          />
          {/* Progress Circle */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="transparent"
            stroke="currentColor"
            className={`transition-all duration-1000 ease-in-out ${
              percentage >= 80 ? 'text-teal-500' : percentage >= 50 ? 'text-amber-500' : 'text-rose-500'
            }`}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
          />
        </svg>
        <div className="text-center">
          <span className={`text-3xl font-black block leading-none ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {total}
          </span>
          <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-1">/ {TOTAL_MAX_SCORE}</span>
        </div>
      </div>

      {/* Mini Bars */}
      <div className="w-full space-y-4 mb-6 relative z-10">
        {(Object.keys(scores) as Array<keyof typeof scores>).map(category => {
          const score = scores[category] || 0;
          const config = SCORE_CATEGORIES[category as keyof typeof SCORE_CATEGORIES];
          if (!config) return null;
          
          const barPct = Math.min((score / config.maxMonthly) * 100, 100);
          
          return (
            <div key={category} className="space-y-1.5">
              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                <span className={`flex items-center gap-1.5 ${darkMode ? 'text-zinc-400' : 'text-gray-500'}`}>
                  <span className={TEXT_COLORS[config.color]}>{ICONS[category]}</span>
                  {config.label}
                </span>
                <span className={darkMode ? 'text-zinc-300' : 'text-gray-700'}>{score} / {config.maxMonthly}</span>
              </div>
              <div className={`h-2 rounded-full overflow-hidden ${darkMode ? 'bg-zinc-800' : 'bg-gray-100'}`}>
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ${COLORS[config.color]}`}
                  style={{ width: `${barPct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Rewards Status */}
      <div className="w-full flex flex-col gap-2 mt-auto">
        <div className={`w-full py-3 px-4 rounded-2xl flex items-center gap-3 border ${
          darkMode ? 'bg-zinc-800/50 border-zinc-700' : 'bg-gray-50 border-gray-100'
        }`}>
          <div className="text-xl">{reward?.badge}</div>
          <div className="flex-1">
            <p className={`text-[10px] font-black uppercase tracking-widest ${
              reward?.color === 'red' ? 'text-rose-500' :
              reward?.color === 'amber' ? 'text-amber-500' :
              reward?.color === 'blue' ? 'text-blue-500' :
              'text-teal-500'
            }`}>{reward?.label}</p>
            <p className={`text-xs font-bold leading-tight mt-0.5 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{reward?.reward}</p>
          </div>
        </div>

        {weeklyEligible && (
          <div className={`w-full py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 border bg-indigo-500/10 border-indigo-500/20 text-indigo-500`}>
            <Gift size={14} />
            <span className="text-[10px] font-black uppercase tracking-widest">{WEEKLY_RULE.reward}</span>
          </div>
        )}
      </div>
    </div>
  );
}
