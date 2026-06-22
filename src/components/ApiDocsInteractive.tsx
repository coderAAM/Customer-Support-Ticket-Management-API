/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Send, CheckCircle2, AlertCircle } from 'lucide-react';

interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PUT';
  path: string;
  description: string;
  category: string;
  requestBodySample?: string;
  responseSchema?: string;
}

const ENDPOINTS: ApiEndpoint[] = [
  {
    category: 'Authentication',
    method: 'POST',
    path: '/api/auth/login',
    description: 'Simulates secure system login by searching user registry by email. Returns user profile details and temporary token security credentials.',
    requestBodySample: JSON.stringify({ email: "liam.agent@ticketcorp.com" }, null, 2),
    responseSchema: '{\n  "message": "Login successful",\n  "user": { "id": "usr-agent1", "fullName": "Liam Carter", "email": "liam.agent@ticketcorp.com", "role": "Agent", ... },\n  "token": "mock-jwt-token-..."\n}'
  },
  {
    category: 'Authentication',
    method: 'POST',
    path: '/api/auth/register',
    description: 'Registers a new system user with roles: Customer, Agent, or Admin. Includes demographic and contact data.',
    requestBodySample: JSON.stringify({
      fullName: "Marcus Aurelius",
      email: "marcus@gmail.com",
      role: "Customer",
      contactNumber: "+1 (555) 777-8888"
    }, null, 2),
    responseSchema: '{\n  "id": "usr-shb82ha2",\n  "fullName": "Marcus Aurelius",\n  "email": "marcus@gmail.com",\n  "role": "Customer",\n  "contactNumber": "+1 (555) 777-8888",\n  "registrationDate": "2026-06-22T08:10:00.000Z"\n}'
  },
  {
    category: 'Dashboard',
    method: 'GET',
    path: '/api/dashboard/stats',
    description: 'Provides aggregated statistics: total tickets, open tickets, in-progress tickets, resolved, and active agent metrics.',
    responseSchema: '{\n  "totalTickets": 5,\n  "openTickets": 2,\n  "inProgressTickets": 1,\n  "resolvedTickets": 1,\n  "closedTickets": 1,\n  "activeAgents": 3\n}'
  },
  {
    category: 'Tickets',
    method: 'GET',
    path: '/api/tickets?status=Open&search=&customer=&agentId=',
    description: 'Retrieves lists of support tickets filtered by multi-parameter searches (title/ID, customer name/email, status array, agent identity).',
    responseSchema: '[\n  {\n    "id": "TKT-1001",\n    "title": "Unable to access billing history panel",\n    "status": "Open",\n    "priority": "High",\n    ...\n  }\n]'
  },
  {
    category: 'Tickets',
    method: 'POST',
    path: '/api/tickets',
    description: 'Initiates a new customer support ticket submission with customer identity records and immediate audit logs.',
    requestBodySample: JSON.stringify({
      title: "Android SDK Crash on Launch",
      description: "App crashes instantly with NullPointerException upon launching version 4.2 build on Android 14 devices.",
      customerInfo: {
        fullName: "Donald Miller",
        email: "donald@gmail.com",
        contactNumber: "+1 (555) 018-4499"
      },
      priority: "High"
    }, null, 2),
    responseSchema: '{\n  "id": "TKT-1006",\n  "title": "Android SDK Crash on Launch",\n  "status": "Open",\n  "priority": "High",\n  ...\n}'
  },
  {
    category: 'Workflow',
    method: 'PUT',
    path: '/api/tickets/TKT-1001/status',
    description: 'Updates a support ticket status (Open, In Progress, Resolved, Closed), keeping an audit log trail of the actor.',
    requestBodySample: JSON.stringify({
      status: "In Progress",
      performerName: "Liam Carter",
      performerRole: "Agent"
    }, null, 2),
    responseSchema: '{\n  "id": "TKT-1001",\n  "status": "In Progress",\n  "lastUpdatedDate": "2026-06-22T08:12:00.000Z",\n  ...\n}'
  },
  {
    category: 'Workflow',
    method: 'PUT',
    path: '/api/tickets/TKT-1003/assign',
    description: 'Assigns a support ticket to an registered Support Agent or Administrator with comprehensive tracking logs.',
    requestBodySample: JSON.stringify({
      agentId: "usr-agent1",
      performerName: "Sarah Jenkins",
      performerRole: "Admin"
    }, null, 2)
  },
  {
    category: 'Replies',
    method: 'POST',
    path: '/api/tickets/TKT-1001/replies',
    description: 'Appends a conversational agent or customer response reply to a ticket thread, updating temporal trackers.',
    requestBodySample: JSON.stringify({
      message: "Indeed, our engineers have successfully fixed the SAML certificate mismatch.",
      sender: {
        id: "usr-agent1",
        fullName: "Liam Carter",
        role: "Agent",
        email: "liam.agent@ticketcorp.com"
      }
    }, null, 2)
  },
  {
    category: 'Gemini AI Integration',
    method: 'POST',
    path: '/api/tickets/TKT-1001/ai-suggest',
    description: 'Leverages server-side Gemini 2.5 Flash to automatically analyze description + conversation thread, drafting recommended next-steps and empathetic drafts.',
    responseSchema: '{\n  "isConfigured": true,\n  "suggestion": "### Core Obstacle\\nDonald is unable to launch billing histories due to a Connection Timeout error...\\n### Recommended steps...\\n### Proposed draft...\\n"\n}'
  }
];

export function ApiDocsInteractive() {
  const [selectedEndpoint, setSelectedEndpoint] = useState<ApiEndpoint>(ENDPOINTS[0]);
  const [customBody, setCustomBody] = useState<string>(ENDPOINTS[0].requestBodySample || '');
  const [responseOutput, setResponseOutput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [statusText, setStatusText] = useState<string>('');

  const handleSelectEndpoint = (ep: ApiEndpoint) => {
    setSelectedEndpoint(ep);
    setCustomBody(ep.requestBodySample || '');
    setResponseOutput('');
    setStatusText('');
  };

  const executeCall = async () => {
    setLoading(true);
    setResponseOutput('');
    setStatusText('');

    try {
      // Determine the exact URL to invoke.
      // E.g. to test easily we can replace dynamic ticket ID examples in paths
      let targetPath = selectedEndpoint.path;
      
      const options: RequestInit = {
        method: selectedEndpoint.method,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      if (selectedEndpoint.method !== 'GET') {
        options.body = customBody;
      }

      const res = await fetch(targetPath, options);
      const data = await res.json();
      
      setStatusText(`${res.status} ${res.statusText}`);
      setResponseOutput(JSON.stringify(data, null, 2));
    } catch (err: any) {
      console.error(err);
      setStatusText('Network Error / Failed Connection');
      setResponseOutput(JSON.stringify({ error: err.message || 'API request failed' }, null, 2));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 bg-slate-900 text-slate-100 rounded p-4 border border-slate-800" id="api-docs-hud">
      {/* Sidebar: Endpoint list */}
      <div className="lg:col-span-4 space-y-3.5 lg:border-r lg:border-slate-800 pr-0 lg:pr-4">
        <div className="pb-2.5 border-b border-slate-800">
          <h2 className="text-sm font-bold tracking-widest uppercase text-white">Interactive API Sandbox</h2>
          <p className="text-[10px] text-slate-400 mt-0.5">Live Swagger-Alternative Tool</p>
        </div>

        <div className="space-y-4 max-h-[460px] overflow-y-auto pr-1.5 custom-scroll">
          {['Authentication', 'Tickets', 'Workflow', 'Replies', 'Gemini AI Integration', 'Dashboard'].map(cat => {
            const list = ENDPOINTS.filter(e => e.category === cat);
            if (list.length === 0) return null;
            return (
              <div key={cat} className="space-y-1.5">
                <span className="text-[9px] font-bold text-slate-500 tracking-wider uppercase">{cat}</span>
                <div className="space-y-1">
                  {list.map(ep => {
                    const isSelected = selectedEndpoint.path === ep.path && selectedEndpoint.method === ep.method;
                    const methodColors = 
                      ep.method === 'GET' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                      ep.method === 'POST' ? 'bg-sky-500/10 text-sky-400 border-sky-500/20' :
                      'bg-amber-500/10 text-amber-400 border-amber-500/20';

                    return (
                      <button
                        key={`${ep.method}-${ep.path}`}
                        onClick={() => handleSelectEndpoint(ep)}
                        className={`w-full flex items-center justify-between text-left p-1.5 rounded border text-[11px] transition ${
                          isSelected ? 'bg-slate-800 border-indigo-500 text-white' : 'bg-slate-950 border-slate-850 hover:bg-slate-800/40 text-slate-300'
                        }`}
                      >
                        <div className="truncate pr-1.5">
                          <p className="font-bold truncate">{ep.path}</p>
                        </div>
                        <span className={`px-1 py-0.2 rounded text-[8.5px] font-mono border ${methodColors}`}>
                          {ep.method}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Workspace: Body input and Live JSON Response */}
      <div className="lg:col-span-8 flex flex-col space-y-3">
        {/* Header Block */}
        <div className="p-3 bg-slate-950 rounded border border-slate-800">
          <div className="flex items-center gap-2">
            <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold uppercase ${
              selectedEndpoint.method === 'GET' ? 'bg-emerald-500/20 text-emerald-400' :
              selectedEndpoint.method === 'POST' ? 'bg-sky-500/20 text-sky-400' :
              'bg-amber-500/20 text-amber-400'
            }`}>
              {selectedEndpoint.method}
            </span>
            <code className="text-xs font-mono font-bold text-white tracking-tight">{selectedEndpoint.path}</code>
          </div>
          <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">{selectedEndpoint.description}</p>
        </div>

        {/* Dynamic payload */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-35">
          <div className="space-y-1.5">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Request Payload (JSON)</h3>
            {selectedEndpoint.method === 'GET' ? (
              <div className="p-4 bg-slate-950 border border-slate-850 rounded flex flex-col items-center justify-center text-center text-xs text-slate-550 min-h-[140px]">
                <CheckCircle2 className="h-4 w-4 mb-1 text-slate-600" />
                No payload required for GET queries. Parameters can be appended as address keywords.
              </div>
            ) : (
              <textarea
                value={customBody}
                onChange={(e) => setCustomBody(e.target.value)}
                rows={6}
                className="w-full text-xs font-mono bg-slate-950 border border-slate-800 rounded p-2.5 text-slate-200 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            )}
          </div>

          <div className="space-y-1.5">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Target Endpoint Schema</h3>
            <pre className="text-[9.5px] font-mono bg-slate-950 border border-slate-850 rounded p-2 text-slate-400 overflow-x-auto min-h-[140px] max-h-[140px] custom-scroll">
              {selectedEndpoint.responseSchema || '{\n  "success": true,\n  "message": "Operation executed successfully."\n}'}
            </pre>
          </div>
        </div>

        {/* Trigger Button */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <div className="flex items-center gap-2 text-xs">
            {statusText && (
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-bold text-[10px] ${
                statusText.startsWith('2') ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
              }`}>
                {statusText.startsWith('2') ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                HTTP Status: {statusText}
              </span>
            )}
          </div>
          <button
            onClick={executeCall}
            disabled={loading}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white font-bold text-[11px] px-3.5 py-1.5 rounded transition cursor-pointer"
          >
            {loading ? 'Sending Request...' : 'Send API Call'}
            <Send className="h-3 w-3" />
          </button>
        </div>

        {/* Live response block */}
        <div className="space-y-1.5">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Server Response Body</h3>
          <pre className="text-xs font-mono bg-slate-950 border border-slate-800 rounded p-3 text-emerald-400 overflow-auto max-h-[190px] min-h-[80px] leading-relaxed custom-scroll">
            {responseOutput ? responseOutput : 'Click "Send API Call" to dispatch requests dynamically and test the API route triggers.'}
          </pre>
        </div>
      </div>
    </div>
  );
}
