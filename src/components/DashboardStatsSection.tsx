/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Layers, FolderOpen, RefreshCcw, CheckCircle2, Archive, ShieldAlert } from 'lucide-react';
import { DashboardStats } from '../types';

interface StatsProps {
  stats: DashboardStats;
  onFilterStatus: (status: string | null) => void;
  activeStatusFilter: string | null;
}

export function DashboardStatsSection({ stats, onFilterStatus, activeStatusFilter }: StatsProps) {
  const cards = [
    {
      label: 'Total Requests',
      value: stats.totalTickets,
      icon: Layers,
      color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-100 dark:border-indigo-900',
      statusValue: null,
    },
    {
      label: 'Open Status',
      value: stats.openTickets,
      icon: FolderOpen,
      color: 'text-rose-600 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900',
      statusValue: 'Open',
    },
    {
      label: 'In Progress',
      value: stats.inProgressTickets,
      icon: RefreshCcw,
      color: 'text-amber-600 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900',
      statusValue: 'In Progress',
    },
    {
      label: 'Resolved',
      value: stats.resolvedTickets,
      icon: CheckCircle2,
      color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900',
      statusValue: 'Resolved',
    },
    {
      label: 'Closed',
      value: stats.closedTickets,
      icon: Archive,
      color: 'text-slate-600 dark:text-slate-400 bg-slate-100/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800',
      statusValue: 'Closed',
    },
    {
      label: 'Active Agents',
      value: stats.activeAgents,
      icon: ShieldAlert,
      color: 'text-sky-600 dark:text-sky-400 bg-sky-50/50 dark:bg-sky-950/20 border-sky-100 dark:border-sky-900',
      statusValue: 'active-agents-indicator', 
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
      {cards.map((card) => {
        const Icon = card.icon;
        const clickable = card.statusValue !== 'active-agents-indicator';
        const isCurrentFilter = activeStatusFilter === card.statusValue;

        return (
          <button
            key={card.label}
            disabled={!clickable}
            onClick={() => clickable && onFilterStatus(card.statusValue)}
            className={`flex flex-col items-start p-3 rounded border text-left transition duration-150 ${card.color} ${
              clickable ? 'cursor-pointer hover:border-slate-400 dark:hover:border-slate-600' : 'opacity-90'
            } ${
              isCurrentFilter 
                ? 'ring-2 ring-indigo-500 ring-offset-1 dark:ring-offset-slate-950 font-bold' 
                : 'shadow-xs'
            }`}
            id={`stat-card-${card.label.toLowerCase().replace(/\s+/g, '-')}`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{card.label}</span>
              <Icon className="h-3.5 w-3.5 opacity-80" />
            </div>
            <p className="text-xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
              {card.value}
            </p>
          </button>
        );
      })}
    </div>
  );
}
