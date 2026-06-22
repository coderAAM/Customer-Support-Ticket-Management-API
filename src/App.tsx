/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, Plus, Landmark, CodeXml, RefreshCw, Layers, ShieldAlert, Laptop, Eye, HelpCircle, 
  ToggleLeft, Lock, ArrowUpRight, Github, BookOpen
} from 'lucide-react';
import { User, SupportTicket, DashboardStats, UserRole, TicketStatus } from './types';
import { DashboardStatsSection } from './components/DashboardStatsSection';
import { TicketTable } from './components/TicketTable';
import { TicketDetailModal } from './components/TicketDetailModal';
import { NewTicketModal } from './components/NewTicketModal';
import { ApiDocsInteractive } from './components/ApiDocsInteractive';

// Simulated users array to easily cycle system permissions
const CLIENT_USERS: User[] = [
  {
    id: 'usr-admin',
    fullName: 'Sarah Jenkins',
    email: 'admin@ticketcorp.com',
    role: UserRole.ADMIN,
    contactNumber: '+1 (555) 019-2834',
    registrationDate: '2026-05-20T00:00:00.000Z',
  },
  {
    id: 'usr-agent2',
    fullName: 'Emma Watson',
    email: 'emma.agent@ticketcorp.com',
    role: UserRole.AGENT,
    contactNumber: '+1 (555) 012-8811',
    registrationDate: '2026-06-02T00:00:00.000Z',
  },
  {
    id: 'usr-customer1',
    fullName: 'Donald Miller',
    email: 'donald@gmail.com',
    role: UserRole.CUSTOMER,
    contactNumber: '+1 (555) 018-4499',
    registrationDate: '2026-06-07T00:00:00.000Z',
  },
  {
    id: 'usr-customer2',
    fullName: 'Alice Robinson',
    email: 'alice@example.com',
    role: UserRole.CUSTOMER,
    contactNumber: '+1 (555) 013-7766',
    registrationDate: '2026-06-12T00:00:00.000Z',
  },
];

export default function App() {
  const [currentUser, setCurrentUser] = useState<User>(CLIENT_USERS[0]); // Default to Sarah (Admin)
  const [activeTab, setActiveTab] = useState<'hub' | 'api-sandbox'>('hub');
  
  // Dashboard global states
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [agents, setAgents] = useState<User[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalTickets: 0,
    openTickets: 0,
    inProgressTickets: 0,
    resolvedTickets: 0,
    closedTickets: 0,
    activeAgents: 0,
  });

  // Filters state parameters
  const [search, setSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [agentFilter, setAgentFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

  // Modals visibility triggers
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [loadingDashboard, setLoadingDashboard] = useState(true);

  // Load and refresh stats + tickets list
  const loadStatsAndTickets = useCallback(async () => {
    try {
      setLoadingDashboard(true);

      // 1. Fetch user lists to populate agents dropdown
      const agentsRes = await fetch('/api/users?role=Agent');
      if (agentsRes.ok) {
        const agList = await agentsRes.json();
        setAgents(agList);
      }

      // 2. Fetch statistics aggregated
      const statsRes = await fetch('/api/dashboard/stats');
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      // 3. Setup dynamic query strings
      const queryParams = new URLSearchParams();
      if (search) queryParams.append('search', search);
      
      // If customer role, only view their own tickets (force secure filter)
      if (currentUser.role === UserRole.CUSTOMER) {
        queryParams.append('customer', currentUser.email);
      } else {
        // Agent/Admin can search by custom fields
        if (customerSearch) queryParams.append('customer', customerSearch);
        if (agentFilter !== 'all') queryParams.append('agentId', agentFilter);
      }

      if (statusFilter) queryParams.append('status', statusFilter);
      
      if (dateFilter !== 'all') {
        const days = parseInt(dateFilter);
        const limitDate = new Date();
        limitDate.setDate(limitDate.getDate() - days);
        queryParams.append('dateAfter', limitDate.toISOString());
      }

      // Fetch
      const ticketsRes = await fetch(`/api/tickets?${queryParams.toString()}`);
      if (ticketsRes.ok) {
        const ticketList = await ticketsRes.json();
        setTickets(ticketList);
      }

    } catch (e) {
      console.error('Core Dashboard fetch pipeline failed:', e);
    } finally {
      setLoadingDashboard(false);
    }
  }, [search, customerSearch, statusFilter, agentFilter, dateFilter, currentUser, refreshTrigger]);

  useEffect(() => {
    loadStatsAndTickets();
  }, [loadStatsAndTickets]);

  // Handle identity switching emulation on frontend
  const handleSwitchIdentity = async (user: User) => {
    setCurrentUser(user);
    // Simulatate backend login route execution to check user synchronization
    try {
      await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email }),
      });
    } catch (e) {
      console.warn('Backend session login simulated locally on network error', e);
    }
    // Reset filters for new identity context
    setSearch('');
    setCustomerSearch('');
    setStatusFilter(null);
    setAgentFilter('all');
    setDateFilter('all');
    setRefreshTrigger(prev => prev + 1);
  };

  const handleManualRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9] dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-200 flex flex-col transition-colors duration-200">
      
      {/* Upper Identity Sandbox Banner Simulator */}
      <div className="bg-[#1E293B] border-b border-slate-800 text-white text-[11px] font-sans px-4 py-2 flex flex-col md:flex-row items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <p className="font-medium tracking-tight text-slate-300">
            <strong className="text-white">Role Emulator Panel:</strong> Choose a persona profile to simulate the workflow permissions.
          </p>
        </div>
        
        {/* Toggle list of active simulators */}
        <div className="flex flex-wrap items-center gap-1.5" id="emulator-identities">
          {CLIENT_USERS.map((usr) => {
            const isSelected = usr.email === currentUser.email;
            const badgeColor = 
              usr.role === UserRole.ADMIN ? 'bg-indigo-600 border-indigo-500 text-white' :
              usr.role === UserRole.AGENT ? 'bg-amber-600 border-amber-500 text-white' :
              'bg-teal-600/90 border-teal-500 text-white';

            return (
              <button
                key={usr.id}
                onClick={() => handleSwitchIdentity(usr)}
                className={`flex items-center gap-1 px-2.5 py-0.5 rounded border text-[10px] font-bold tracking-tight cursor-pointer transition ${
                  isSelected 
                    ? `${badgeColor} ring-1 ring-white/10` 
                    : 'bg-slate-950 border-slate-850 text-slate-400 hover:text-white hover:bg-slate-850'
                }`}
              >
                <div className="h-1 w-1 rounded-full bg-white shrink-0"></div>
                {usr.fullName} ({usr.role})
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Core Site Navbar Header */}
      <header className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-850 px-6 flex items-center justify-between sticky top-0 z-30 shrink-0 shadow-xs">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 bg-indigo-600 dark:bg-indigo-500 flex items-center justify-center rounded text-white font-black">
            <Landmark className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-sm font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5 uppercase">
              <span>Resolvly</span>
              <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900 bg-indigo-50 dark:bg-indigo-950/40 px-1 py-0.1 rounded uppercase">API Hub</span>
            </h1>
          </div>
        </div>

        {/* Tab Selection controls & Action Items */}
        <div className="flex items-center gap-2">
          
          <div className="flex bg-slate-100 dark:bg-slate-950 p-0.5 rounded border border-slate-200 dark:border-slate-850">
            <button
              onClick={() => setActiveTab('hub')}
              className={`flex items-center gap-1 text-[11px] font-bold px-3 py-1 rounded transition cursor-pointer ${
                activeTab === 'hub'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-950 dark:hover:text-slate-100'
              }`}
            >
              <Layers className="h-3 w-3" />
              Overview Hub
            </button>
            <button
              onClick={() => setActiveTab('api-sandbox')}
              className={`flex items-center gap-1 text-[11px] font-bold px-3 py-1 rounded transition cursor-pointer ${
                activeTab === 'api-sandbox'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-950 dark:hover:text-slate-100'
              }`}
            >
              <CodeXml className="h-3 w-3" />
              API Playground (Postman Docs)
            </button>
          </div>

          <button
            onClick={handleManualRefresh}
            className="p-1 px-1.5 border border-slate-200 dark:border-slate-800 rounded text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-950 transition cursor-pointer"
            title="Manual Database reload"
          >
            <RefreshCw className="h-3 w-3" />
          </button>

          {/* Quick Create support ticket for Active Emulator User */}
          <button
            onClick={() => setIsNewTicketOpen(true)}
            className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold px-3 py-1.5 rounded transition cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            + New Ticket
          </button>
        </div>
      </header>

      {/* Main Core Content Stage */}
      <main className="flex-1 px-4 py-4 max-w-7xl mx-auto w-full space-y-4">
        
        {/* Dynamic active user layout context alert helper */}
        <div className="bg-white dark:bg-slate-900 p-2.5 rounded border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 flex items-center justify-center font-bold text-slate-600 dark:text-slate-400 shrink-0 text-xs text-center uppercase">
              {currentUser.fullName.charAt(0)}
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Perspective</p>
              <p className="font-bold text-slate-850 dark:text-slate-200">
                {currentUser.fullName} <span className="font-semibold text-[10px] text-slate-400">({currentUser.role})</span> &bull; <span className="font-mono text-[10px] text-slate-400">{currentUser.email}</span>
              </p>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 px-2 py-1 rounded text-left sm:text-right">
            <span className="text-[9px] uppercase font-mono font-bold text-indigo-600 dark:text-indigo-400 block tracking-widest">Access Scope</span>
            <span className="font-bold text-[10px] text-slate-500 dark:text-slate-300">
              {currentUser.role === UserRole.CUSTOMER 
                ? 'Filtered: Private Tickets' 
                : 'Full System Read/Write Permissions'}
            </span>
          </div>
        </div>

        {activeTab === 'hub' ? (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Real-time stats panels widgets */}
            <DashboardStatsSection 
              stats={stats} 
              onFilterStatus={setStatusFilter}
              activeStatusFilter={statusFilter}
            />

            {/* Support Tickets list component workspace */}
            <div>
              {loadingDashboard ? (
                <div className="p-16 text-center border rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-850">
                  <div className="animate-spin h-6 w-6 border-2 border-indigo-600 border-t-transparent rounded-full mx-auto mb-3" />
                  <p className="text-xs text-slate-400 font-medium">Scanning ticket data registries...</p>
                </div>
              ) : (
                <TicketTable
                  tickets={tickets}
                  agents={CLIENT_USERS.filter(u => u.role === UserRole.AGENT || u.role === UserRole.ADMIN)}
                  onSelectTicket={(t) => setSelectedTicketId(t.id)}
                  search={search}
                  setSearch={setSearch}
                  customerSearch={customerSearch}
                  setCustomerSearch={setCustomerSearch}
                  statusFilter={statusFilter}
                  setStatusFilter={setStatusFilter}
                  agentFilter={agentFilter}
                  setAgentFilter={setAgentFilter}
                  dateFilter={dateFilter}
                  setDateFilter={setDateFilter}
                />
              )}
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in duration-200">
            <ApiDocsInteractive />
          </div>
        )}

      </main>

      {/* Footer bar credits */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-850 py-6 mt-12 text-center text-xs text-slate-400">
        <p className="font-semibold text-slate-500">Teyzix Core Internship (June Batch Batch BE-2)</p>
        <p className="mt-1 font-mono text-[11px] text-slate-400">Robust REST APIs & Full-Stack Ticket Administration System © 2026</p>
      </footer>

      {/* Dynamic Drawer modals overlay components */}
      {selectedTicketId && (
        <TicketDetailModal
          ticketId={selectedTicketId}
          currentUser={currentUser}
          agents={CLIENT_USERS.filter(u => u.role === UserRole.AGENT || u.role === UserRole.ADMIN)}
          onClose={() => setSelectedTicketId(null)}
          onRefresh={loadStatsAndTickets}
        />
      )}

      {isNewTicketOpen && (
        <NewTicketModal
          currentUser={currentUser}
          onClose={() => setIsNewTicketOpen(false)}
          onRefresh={loadStatsAndTickets}
        />
      )}

    </div>
  );
}
