/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Search, Filter, Calendar, UserCheck, AlertOctagon, Download } from 'lucide-react';
import { SupportTicket, TicketStatus, TicketPriority, User } from '../types';

interface TableProps {
  tickets: SupportTicket[];
  agents: User[];
  onSelectTicket: (ticket: SupportTicket) => void;
  search: string;
  setSearch: (val: string) => void;
  customerSearch: string;
  setCustomerSearch: (val: string) => void;
  statusFilter: string | null;
  setStatusFilter: (val: string | null) => void;
  agentFilter: string;
  setAgentFilter: (val: string) => void;
  dateFilter: string;
  setDateFilter: (val: string) => void;
}

export function TicketTable({
  tickets,
  agents,
  onSelectTicket,
  search,
  setSearch,
  customerSearch,
  setCustomerSearch,
  statusFilter,
  setStatusFilter,
  agentFilter,
  setAgentFilter,
  dateFilter,
  setDateFilter,
}: TableProps) {

  const getPriorityBadgeClass = (priority: TicketPriority) => {
    switch (priority) {
      case TicketPriority.LOW:
        return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900';
      case TicketPriority.MEDIUM:
        return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-900/60 dark:text-slate-400 dark:border-slate-800';
      case TicketPriority.HIGH:
        return 'bg-orange-100 text-orange-600 border-orange-200 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-900';
      case TicketPriority.CRITICAL:
        return 'bg-red-100 text-red-600 border-red-200 dark:bg-red-950/45 dark:text-red-400 dark:border-red-900/80 animate-pulse';
    }
  };

  const getStatusBadgeClass = (status: TicketStatus) => {
    switch (status) {
      case TicketStatus.OPEN:
        return 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900';
      case TicketStatus.IN_PROGRESS:
        return 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-900';
      case TicketStatus.RESOLVED:
        return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900';
      case TicketStatus.CLOSED:
        return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-900/60 dark:text-slate-400 dark:border-slate-800';
    }
  };

  // Human friendly relative datetime format helper
  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const escapeCSVValue = (value: any) => {
    if (value === null || value === undefined) return '""';
    const strVal = String(value);
    const escaped = strVal.replace(/"/g, '""');
    return `"${escaped}"`;
  };

  const handleExportCSV = () => {
    if (tickets.length === 0) return;

    const headers = [
      'Ticket ID',
      'Subject Title',
      'Description',
      'Customer Name',
      'Customer Email',
      'Customer Phone',
      'Assigned Agent',
      'Priority',
      'Status',
      'Created At',
      'Last Updated'
    ];

    const csvRows = [headers.map(escapeCSVValue).join(',')];

    tickets.forEach((t) => {
      const row = [
        t.id,
        t.title,
        t.description,
        t.customerInfo.fullName,
        t.customerInfo.email,
        t.customerInfo.contactNumber || '',
        t.assignedAgent ? t.assignedAgent.fullName : 'Unassigned',
        t.priority,
        t.status,
        t.creationDate,
        t.lastUpdatedDate
      ];
      csvRows.push(row.map(escapeCSVValue).join(','));
    });

    const csvContent = '\uFEFF' + csvRows.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    const fileNameDate = new Date().toISOString().split('T')[0];
    link.href = url;
    link.setAttribute('download', `support-tickets-export-${fileNameDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3" id="ticket-table-container">
      {/* Table Header Section with Counter and Export */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pb-1 animate-in fade-in duration-200" id="ticket-table-header">
        <div>
          <h3 className="text-xs font-extrabold uppercase tracking-widest text-[#1E293B] dark:text-white">
            Support Tickets List Cache
          </h3>
          <p className="text-[10px] text-slate-400 font-medium">Manage workflow queues, delegation targets and resolutions</p>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-slate-900 border border-indigo-100 dark:border-slate-850 px-2 py-0.5 rounded shadow-3xs" id="records-counter-badge">
            {tickets.length} records
          </span>
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={tickets.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-extrabold uppercase bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-705 dark:text-slate-300 rounded shadow-2xs hover:shadow-xs transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none"
            id="export-csv-button-header"
            title="Export standard CSV reporting list of current filtered records"
          >
            <Download className="h-3 w-3 text-slate-450 dark:text-slate-400" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Search and Filters Bento Grid */}
      <div className="bg-white dark:bg-slate-900 rounded p-3 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2.5">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5">
          
          {/* Ticket Title/ID query input */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-450 dark:text-slate-400" />
            <input
              type="text"
              placeholder="Search ID, Title, or Topic..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 border rounded text-xs bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-850 text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              id="search-ticket-input"
            />
          </div>

          {/* Customer name/email query input */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-450 dark:text-slate-400" />
            <input
              type="text"
              placeholder="Search Customer Name/Email..."
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 border rounded text-xs bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-850 text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              id="search-customer-input"
            />
          </div>

          {/* Assigned Agent filter dropdown */}
          <div className="relative">
            <UserCheck className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-450 dark:text-slate-400" />
            <select
              value={agentFilter}
              onChange={(e) => setAgentFilter(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 border rounded text-xs bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-850 text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500"
              id="filter-agent-select"
            >
              <option value="all">Filter by Agent: All</option>
              <option value="none">Unassigned Tickets</option>
              {agents.map((ag) => (
                <option key={ag.id} value={ag.id}>
                  {ag.fullName}
                </option>
              ))}
            </select>
          </div>

          {/* Registration/Creation Date filter dropdown */}
          <div className="relative">
            <Calendar className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-450 dark:text-slate-400" />
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 border rounded text-xs bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-850 text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500"
              id="filter-date-select"
            >
              <option value="all">Filter by Date: All Time</option>
              <option value="1">Submitted: Last 24 Hours</option>
              <option value="3">Submitted: Last 3 Days</option>
              <option value="7">Submitted: Last 1 Week</option>
            </select>
          </div>

        </div>

        {/* Quick status filters */}
        <div className="flex flex-wrap items-center gap-1 pt-2 border-t border-slate-100 dark:border-slate-800">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-2">Status Filter:</span>
          {['All', 'Open', 'In Progress', 'Resolved', 'Closed'].map((st) => {
            const isSelected = st === 'All' ? statusFilter === null : statusFilter === st;
            return (
              <button
                key={st}
                onClick={() => setStatusFilter(st === 'All' ? null : st)}
                className={`text-[10px] px-2 py-0.5 rounded border transition font-bold uppercase cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs font-bold'
                    : 'bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-850 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900'
                }`}
              >
                {st}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tickets Data-Table View */}
      <div className="bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950 text-slate-500 uppercase text-[10px] font-bold tracking-widest border-b border-slate-200 dark:border-slate-850">
                <th className="py-2.5 px-3.5">Ticket ID</th>
                <th className="py-2.5 px-3.5">Subject Title</th>
                <th className="py-2.5 px-3.5">Customer</th>
                <th className="py-2.5 px-3.5">Assigned To</th>
                <th className="py-2.5 px-3 text-center">Priority</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3.5 text-right">Last Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150 dark:divide-slate-850">
              {tickets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                    <AlertOctagon className="h-6 w-6 mx-auto text-slate-300 dark:text-slate-800 mb-2" />
                    No support tickets matching current search criteria were discovered.
                  </td>
                </tr>
              ) : (
                tickets.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => onSelectTicket(t)}
                    className="hover:bg-indigo-50/20 dark:hover:bg-slate-950/40 cursor-pointer transition text-xs relative group"
                    id={`ticket-row-${t.id.toLowerCase()}`}
                  >
                    <td className="py-2 px-3.5 font-mono text-[10.5px] font-bold text-indigo-650 dark:text-indigo-400">
                      {t.id}
                    </td>
                    <td className="py-2 px-3.5 max-w-[260px] truncate">
                      <div className="font-bold text-slate-800 dark:text-white truncate">
                        {t.title}
                      </div>
                      <div className="text-[10px] text-slate-450 dark:text-slate-500 truncate mt-0.5">
                        {t.description}
                      </div>
                    </td>
                    <td className="py-2 px-3.5">
                      <div className="font-medium text-slate-800 dark:text-slate-200 truncate">
                        {t.customerInfo.fullName}
                      </div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                        {t.customerInfo.email}
                      </div>
                    </td>
                    <td className="py-2 px-3.5">
                      {t.assignedAgent ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-slate-700 dark:text-slate-300 font-semibold bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                          <span className="h-1 w-1 rounded-full bg-emerald-500"></span>
                          {t.assignedAgent.fullName}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${getPriorityBadgeClass(t.priority)}`}>
                        {t.priority}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border ${getStatusBadgeClass(t.status)}`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="py-2 px-3.5 text-right font-mono text-[10px] text-slate-400 dark:text-slate-500">
                      {formatDate(t.lastUpdatedDate)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
