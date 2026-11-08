import React, { useState } from 'react';
import { Transaction } from '../types';
import { formatCurrency, CATEGORY_COLORS } from '../utils/formatters';

interface DonutChartProps {
  transactions: Transaction[];
}

export const CategoryDonutChart: React.FC<DonutChartProps> = ({ transactions }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Consider only expenses (fixed and variable)
  const expenseTxs = transactions.filter((t) => t.type !== 'income');
  const totalExpense = expenseTxs.reduce((sum, t) => sum + t.amount, 0);

  const categoryTotals = expenseTxs.reduce((acc, t) => {
    const cat = t.category || 'Outros';
    acc[cat] = (acc[cat] || 0) + t.amount;
    return acc;
  }, {} as Record<string, number>);

  const sortedCategories = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, amount]) => ({
      name: cat,
      amount,
      percentage: totalExpense > 0 ? (amount / totalExpense) * 100 : 0,
      color: (CATEGORY_COLORS as Record<string, { fill: string }>)[cat]?.fill || '#94A3B8',
    }));

  if (totalExpense === 0 || sortedCategories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400">
        <p className="text-sm font-medium">Nenhuma despesa para exibir no gráfico.</p>
        <p className="text-xs mt-1 text-slate-400">Adicione gastos fixos ou variáveis para ver a distribuição.</p>
      </div>
    );
  }

  // Calculate SVG donut segments
  const size = 180;
  const strokeWidth = 26;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
      {/* SVG Donut Visual */}
      <div className="md:col-span-5 flex flex-col items-center justify-center relative">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke="#F1F5F9"
            strokeWidth={strokeWidth}
          />
          {sortedCategories.map((item, idx) => {
            const strokeDashoffset = circumference - (circumference * item.percentage) / 100;
            const rotation = (accumulatedPercent / 100) * 360;
            accumulatedPercent += item.percentage;

            const isHovered = hoveredIndex === idx;

            return (
              <circle
                key={item.name}
                cx={center}
                cy={center}
                r={radius}
                fill="transparent"
                stroke={item.color}
                strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                strokeDasharray={`${(circumference * item.percentage) / 100} ${circumference}`}
                transform={`rotate(${rotation} ${center} ${center})`}
                className="transition-all duration-300 cursor-pointer"
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
            );
          })}
        </svg>

        {/* Center overlay label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
          <span className="text-xs uppercase text-slate-400 font-medium">
            {hoveredIndex !== null ? sortedCategories[hoveredIndex].name : 'Total Gastos'}
          </span>
          <span className="text-sm font-bold font-mono tabular-nums text-slate-800">
            {hoveredIndex !== null
              ? formatCurrency(sortedCategories[hoveredIndex].amount)
              : formatCurrency(totalExpense)}
          </span>
          {hoveredIndex !== null && (
            <span className="text-xs font-semibold text-indigo-600 font-mono">
              {sortedCategories[hoveredIndex].percentage.toFixed(1)}%
            </span>
          )}
        </div>
      </div>

      {/* Categories Legend */}
      <div className="md:col-span-7 space-y-2">
        {sortedCategories.map((cat, idx) => (
          <div
            key={cat.name}
            onMouseEnter={() => setHoveredIndex(idx)}
            onMouseLeave={() => setHoveredIndex(null)}
            className={`flex items-center justify-between p-2 rounded-lg transition-colors cursor-pointer text-xs ${
              hoveredIndex === idx ? 'bg-slate-100' : 'hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center space-x-2.5 truncate">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: cat.color }}
              />
              <span className="font-medium text-slate-700 truncate">{cat.name}</span>
            </div>
            <div className="flex items-center space-x-3 shrink-0 font-mono tabular-nums">
              <span className="text-slate-500">{cat.percentage.toFixed(1)}%</span>
              <span className="font-semibold text-slate-800">{formatCurrency(cat.amount)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

interface CashFlowBarsProps {
  income: number;
  fixed: number;
  variable: number;
  savingsGoal?: number;
}

export const CashFlowDistribution: React.FC<CashFlowBarsProps> = ({
  income,
  fixed,
  variable,
  savingsGoal,
}) => {
  const totalSpent = fixed + variable;
  const balance = income - totalSpent;
  const maxRef = Math.max(income, totalSpent, 1);

  const fixedPct = Math.min(100, (fixed / maxRef) * 100);
  const variablePct = Math.min(100, (variable / maxRef) * 100);
  const incomePct = Math.min(100, (income / maxRef) * 100);

  // 50-30-20 assessment
  // Needs: fixed / income
  // Wants: variable / income
  // Savings: balance / income
  const hasIncome = income > 0;
  const needsRatio = hasIncome ? Math.round((fixed / income) * 100) : 0;
  const wantsRatio = hasIncome ? Math.round((variable / income) * 100) : 0;
  const savingsRatio = hasIncome ? Math.round((balance / income) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* Visual Bar Comparison */}
      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="font-medium text-slate-600">Receitas Totais</span>
            <span className="font-mono font-semibold text-emerald-600 tabular-nums">
              {formatCurrency(income)}
            </span>
          </div>
          <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${incomePct}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="font-medium text-slate-600">Gastos Fixos & Parcelas</span>
            <span className="font-mono font-semibold text-amber-600 tabular-nums">
              {formatCurrency(fixed)}
            </span>
          </div>
          <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full transition-all duration-500"
              style={{ width: `${fixedPct}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="font-medium text-slate-600">Gastos Variáveis</span>
            <span className="font-mono font-semibold text-rose-600 tabular-nums">
              {formatCurrency(variable)}
            </span>
          </div>
          <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-rose-500 rounded-full transition-all duration-500"
              style={{ width: `${variablePct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Regra 50-30-20 Card */}
      <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 text-xs">
        <div className="flex items-center justify-between mb-2">
          <span className="font-bold text-slate-700">Equilíbrio Orçamentário (Regra 50/30/20)</span>
          <span className="text-slate-400">Recomendado</span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 bg-white rounded-lg border border-slate-200">
            <p className="text-[11px] text-slate-500">Fixos / Necessidades</p>
            <p className={`font-mono font-bold text-sm mt-0.5 ${needsRatio > 55 ? 'text-amber-600' : 'text-slate-800'}`}>
              {needsRatio}%
            </p>
            <p className="text-[10px] text-slate-400">Alvo: ~50%</p>
          </div>
          <div className="p-2 bg-white rounded-lg border border-slate-200">
            <p className="text-[11px] text-slate-500">Variáveis / Lazer</p>
            <p className={`font-mono font-bold text-sm mt-0.5 ${wantsRatio > 35 ? 'text-rose-600' : 'text-slate-800'}`}>
              {wantsRatio}%
            </p>
            <p className="text-[10px] text-slate-400">Alvo: ~30%</p>
          </div>
          <div className="p-2 bg-white rounded-lg border border-slate-200">
            <p className="text-[11px] text-slate-500">Poupança / Saldo</p>
            <p className={`font-mono font-bold text-sm mt-0.5 ${savingsRatio >= 20 ? 'text-emerald-600' : 'text-slate-700'}`}>
              {savingsRatio}%
            </p>
            <p className="text-[10px] text-slate-400">Alvo: ~20%</p>
          </div>
        </div>
      </div>
    </div>
  );
};
