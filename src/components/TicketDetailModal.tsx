/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Send, User, Trash, Check, Sparkles, Clock, History, AlertCircle, ToggleLeft, ClipboardCheck,
  Printer, Download, Tag, Copy, CheckCircle
} from 'lucide-react';
import { SupportTicket, TicketReply, AuditLog, UserRole, TicketStatus, TicketPriority } from '../types';

interface DetailProps {
  ticketId: string;
  currentUser: { id: string; fullName: string; role: UserRole; email: string };
  agents: Array<{ id: string; fullName: string; email: string }>;
  onClose: () => void;
  onRefresh: () => void;
}

// Custom simple markdown formatter to output rich bullet lists, headers, and code snippets from Gemini safe list
function MarkdownSimple({ text }: { text: string }) {
  if (!text) return null;
  const lines = text.split('\n');
  return (
    <div className="space-y-2 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
      {lines.map((line, idx) => {
        // Headers
        if (line.trim().startsWith('###')) {
          return (
            <h4 key={idx} className="text-xs font-bold text-slate-900 dark:text-white mt-4 border-b border-slate-100 dark:border-slate-800 pb-1 uppercase tracking-wider">
              {line.replace('###', '').trim()}
            </h4>
          );
        }
        if (line.trim().startsWith('##')) {
          return (
            <h3 key={idx} className="text-sm font-bold text-slate-900 dark:text-white mt-4 border-b border-slate-100 dark:border-slate-800 pb-1">
              {line.replace('##', '').trim()}
            </h3>
          );
        }
        if (line.trim().startsWith('#')) {
          return (
            <h2 key={idx} className="text-base font-bold text-indigo-600 dark:text-indigo-400 mt-4">
              {line.replace('#', '').trim()}
            </h2>
          );
        }
        // Bullet point lists
        if (line.trim().startsWith('*') || line.trim().startsWith('-')) {
          return (
            <li key={idx} className="ml-4 list-disc text-slate-600 dark:text-slate-300">
              {line.trim().substring(1).trim()}
            </li>
          );
        }
        // Bold formatting
        if (line.includes('**')) {
          const parts = line.split('**');
          return (
            <p key={idx}>
              {parts.map((p, pIdx) => (pIdx % 2 === 1 ? <strong key={pIdx} className="font-bold text-indigo-700 dark:text-indigo-400">{p}</strong> : p))}
            </p>
          );
        }
        // Standard code-blocks or paragraphs
        if (line.trim() === '') return <div key={idx} className="h-1" />;
        return <p key={idx}>{line}</p>;
      })}
    </div>
  );
}

export function TicketDetailModal({ ticketId, currentUser, agents, onClose, onRefresh }: DetailProps) {
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [replies, setReplies] = useState<TicketReply[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [submittingReply, setSubmittingReply] = useState(false);
  const [updatingWorkflow, setUpdatingWorkflow] = useState(false);
  const [showVoucher, setShowVoucher] = useState(false);
  const [copied, setCopied] = useState(false);

  // Gemini state parameters
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string>('');
  const [aiError, setAiError] = useState<string>('');

  const chatEndRef = useRef<HTMLDivElement>(null);

  const fetchTicketDetails = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/tickets/${ticketId}`);
      if (!res.ok) throw new Error('API fetch failed');
      const data = await res.json();
      
      setTicket(data);
      setReplies(data.replies || []);
      setAuditLogs(data.auditLogs || []);
    } catch (e) {
      console.error('Error loading ticket details:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTicketDetails();
    setAiSuggestion('');
    setAiError('');
  }, [ticketId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [replies]);

  const handlePostReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !ticket) return;

    try {
      setSubmittingReply(true);
      const payload = {
        message: newMessage,
        sender: {
          id: currentUser.id,
          fullName: currentUser.fullName,
          role: currentUser.role,
          email: currentUser.email,
        }
      };

      const res = await fetch(`/api/tickets/${ticketId}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Failed to save reply');
      
      setNewMessage('');
      await fetchTicketDetails();
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleUpdateStatus = async (newStatus: TicketStatus) => {
    if (!ticket) return;
    try {
      setUpdatingWorkflow(true);
      const res = await fetch(`/api/tickets/${ticketId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          performerName: currentUser.fullName,
          performerRole: currentUser.role
        })
      });
      if (!res.ok) throw new Error('Failed to update status');
      
      await fetchTicketDetails();
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingWorkflow(false);
    }
  };

  const handleAssignAgent = async (agentId: string) => {
    if (!ticket) return;
    try {
      const res = await fetch(`/api/tickets/${ticketId}/assign`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: agentId || null,
          performerName: currentUser.fullName,
          performerRole: currentUser.role
        })
      });
      if (!res.ok) throw new Error('Failed to delegate ticket');
      
      await fetchTicketDetails();
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAiAdvice = async () => {
    setAiLoading(true);
    setAiSuggestion('');
    setAiError('');
    try {
      const res = await fetch(`/api/tickets/${ticketId}/ai-suggest`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gemini processing failure');
      }
      setAiSuggestion(data.suggestion);
    } catch (err: any) {
      setAiError(err.message || 'AI Support Advisement temporarily unavailable.');
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-slate-950 p-4 rounded border border-slate-300 dark:border-slate-800 flex flex-col items-center shadow">
          <div className="animate-spin h-6 w-6 border-2 border-indigo-600 border-t-transparent rounded-full mb-2" />
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Retrieving Ticket Metadata...</p>
        </div>
      </div>
    );
  }

  if (!ticket) return null;

  // Verify permissions: Customers can only interact with their tickets
  const isAgentOrAdmin = currentUser.role === UserRole.AGENT || currentUser.role === UserRole.ADMIN;
  const workflowLevels = [TicketStatus.OPEN, TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED, TicketStatus.CLOSED];
  const currentStepIndex = workflowLevels.indexOf(ticket.status);

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-40 p-3" id="ticket-modal-overlay">
      <div className="bg-slate-50 dark:bg-slate-950 rounded w-full max-w-6xl h-[90vh] flex flex-col border border-slate-300 dark:border-slate-850 shadow-2xl overflow-hidden animate-in fade-in duration-100">
        
        {/* Header toolbar */}
        <div className="bg-white dark:bg-slate-900 px-4 py-2.5 border-b border-slate-200 dark:border-slate-850 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[10px] font-bold text-indigo-650 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.2 rounded border border-indigo-100">
                {ticket.id}
              </span>
              <span className={`inline-block text-[9px] font-bold px-1.5 py-0.2 rounded border uppercase ${
                ticket.priority === TicketPriority.CRITICAL ? 'bg-red-100 text-red-650 border-red-200' :
                ticket.priority === TicketPriority.HIGH ? 'bg-orange-100 text-orange-600 border-orange-200' :
                'bg-slate-100 text-slate-650 border-slate-200'
              }`}>
                {ticket.priority} Priority
              </span>
            </div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[480px] mt-0.5">
              {ticket.title}
            </h2>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Quick Status Workflow Controller for Agents/Admins */}
            {isAgentOrAdmin && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-950">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide mr-1 whitespace-nowrap">Status:</span>
                <select
                  value={ticket.status}
                  onChange={(e) => handleUpdateStatus(e.target.value as TicketStatus)}
                  disabled={updatingWorkflow}
                  className="bg-transparent text-xs font-bold text-indigo-600 dark:text-indigo-400 border-none outline-none focus:ring-0 py-0"
                >
                  {workflowLevels.map(st => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Quick status close for Customer */}
            {!isAgentOrAdmin && ticket.status !== TicketStatus.CLOSED && (
              <button
                onClick={() => handleUpdateStatus(TicketStatus.CLOSED)}
                className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[10px] font-bold uppercase px-2.5 py-1 rounded transition"
              >
                Close Ticket
              </button>
            )}

            {!isAgentOrAdmin && ticket.status === TicketStatus.CLOSED && (
              <button
                onClick={() => handleUpdateStatus(TicketStatus.OPEN)}
                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[10px] font-bold uppercase px-2.5 py-1 rounded transition"
              >
                Reopen Ticket
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-500 transition cursor-pointer"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>

        {/* Status Stepper Progression track */}
        <div className="bg-slate-100 dark:bg-slate-950/80 px-4 py-2 border-b border-slate-200 dark:border-slate-900 grid grid-cols-4 gap-1 text-center text-[10px]">
          {workflowLevels.map((st, i) => {
            const isCompleted = i < currentStepIndex;
            const isActive = i === currentStepIndex;

            return (
              <div key={st} className="flex items-center gap-1.5 justify-center py-0.5 font-bold uppercase tracking-wider">
                <span className={`h-4 w-4 rounded-full flex items-center justify-center text-[9px] border ${
                  isCompleted ? 'bg-emerald-600 border-emerald-600 text-white' :
                  isActive ? 'bg-indigo-600 border-indigo-600 text-white font-bold' :
                  'bg-white dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-slate-800'
                }`}>
                  {isCompleted ? '✓' : i + 1}
                </span>
                <span className={isActive ? 'text-indigo-600 dark:text-indigo-400 font-extrabold' : isCompleted ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400'}>
                  {st}
                </span>
              </div>
            );
          })}
        </div>

        {/* Modal Main Grid */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          
          {/* Left / Middle: Descriptions and Chat messages replies */}
          <div className="lg:col-span-8 flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-hidden">
            
            {/* Scrollable Conversation Box */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[calc(100%-60px)] custom-scroll">
              
              {/* Customer Init ticket description ticket details */}
              <div className="bg-white dark:bg-slate-900 p-4 rounded border border-slate-200 dark:border-slate-850 shadow-xs relative">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xs uppercase border border-indigo-150">
                      {ticket.customerInfo.fullName.substring(0, 2)}
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Customer Submissions Request</p>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                        {ticket.customerInfo.fullName}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 select-all">
                    {new Date(ticket.creationDate).toLocaleString()}
                  </span>
                </div>
                
                <div className="mt-3 text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-950/70 p-3 rounded border border-slate-150 dark:border-slate-900 select-all whitespace-pre-wrap">
                  {ticket.description}
                </div>

                {ticket.customerInfo.contactNumber && (
                  <p className="text-[9.5px] text-slate-400 mt-1.5 italic font-semibold">
                    * Callback phone verification number logged: {ticket.customerInfo.contactNumber}
                  </p>
                )}
              </div>

              {/* Chat replies list */}
              <div className="space-y-3">
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200 dark:border-slate-800 pb-1 flex items-center justify-between">
                  <span>Conversation Exchange Trail</span>
                  <span className="bg-slate-200 dark:bg-slate-800 px-1 py-0.2 rounded text-[8.5px] font-mono">{replies.length} Msg</span>
                </div>

                {replies.length === 0 ? (
                  <div className="py-4 text-center text-slate-400 text-xs italic">
                    No replies yet dispatched back to this ticket thread pipeline.
                  </div>
                ) : (
                  replies.map((reply) => {
                    const isSelf = reply.senderInfo.id === currentUser.id;
                    const senderRole = reply.senderInfo.role;

                    // Compute bubble aesthetics based on Role
                    const isAgent = senderRole === UserRole.AGENT || senderRole === UserRole.ADMIN;
                    
                    return (
                      <div
                        key={reply.id}
                        className={`flex gap-2 max-w-[85%] ${isSelf ? 'ml-auto flex-row-reverse' : ''}`}
                      >
                        <div className={`h-7 w-7 rounded flex items-center justify-center font-bold text-xs select-none shrink-0 ${
                          isAgent 
                            ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300' 
                            : 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400'
                        }`}>
                          {reply.senderInfo.fullName.substring(0, 2).toUpperCase()}
                        </div>

                        <div className="space-y-0.5">
                          <div className={`flex items-center gap-1 text-[10px] ${isSelf ? 'justify-end' : ''}`}>
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {reply.senderInfo.fullName}
                            </span>
                            <span className={`px-1 py-0.1 rounded text-[8.5px] font-semibold tracking-wider uppercase border ${
                              isAgent 
                                ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' 
                                : 'bg-indigo-500/10 text-indigo-550 border-indigo-500/20'
                            }`}>
                              {senderRole}
                            </span>
                            <span className="text-[9px] text-slate-400 font-mono scale-90">
                              {new Date(reply.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          <div className={`p-2.5 rounded text-xs leading-relaxed shadow-xs border ${
                            isSelf
                              ? 'bg-indigo-650 border-indigo-650 text-white rounded-tr-none'
                              : isAgent
                                ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-150 dark:border-amber-900/40 text-slate-800 dark:text-slate-200 rounded-tl-none'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none'
                          }`}>
                            <p className="whitespace-pre-wrap">{reply.message}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Gemini Advisor section */}
              {isAgentOrAdmin && (
                <div className="mt-6 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <div className="bg-indigo-950/30 border border-indigo-900/50 rounded p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4.5 w-4.5 text-indigo-400 animate-pulse animate-ease-out" />
                        <div>
                          <h3 className="text-[11px] font-extrabold text-white uppercase tracking-wider">Gemini Smart Assistant Advice</h3>
                          <p className="text-[9.5px] text-indigo-300">Automated diagnostic suggestions and ticket reply draft builder</p>
                        </div>
                      </div>
                      <button
                        onClick={fetchAiAdvice}
                        disabled={aiLoading}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold uppercase px-3 py-1 rounded transition cursor-pointer shadow hover:shadow-indigo-500/35"
                      >
                        {aiLoading ? 'Analyzing Context...' : 'Generate Suggestions'}
                      </button>
                    </div>

                    {aiLoading && (
                      <div className="flex items-center gap-2 justify-center py-4 text-xs text-indigo-300 italic">
                        <div className="animate-spin h-3.5 w-3.5 border-2 border-indigo-400 border-t-transparent rounded-full" />
                        Calling Gemini server models to parse replies logs and trace debug commands...
                      </div>
                    )}

                    {aiError && (
                      <div className="flex items-center gap-2 bg-red-950/40 border border-red-900 text-xs text-red-300 p-2.5 rounded">
                        <AlertCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />
                        <span>{aiError}</span>
                      </div>
                    )}

                    {aiSuggestion && (
                      <div className="bg-slate-950 rounded p-3 border border-indigo-900/40 max-h-[22vw] overflow-y-auto custom-scroll">
                        <MarkdownSimple text={aiSuggestion} />
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>

            {/* Input Response Submission Form message prompt */}
            <form onSubmit={handlePostReply} className="px-4 py-2.5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-850 flex items-center gap-2">
              <input
                type="text"
                placeholder="Write a message reply to this customer support ticket..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                disabled={submittingReply || ticket.status === TicketStatus.CLOSED}
                className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded px-3 py-2 text-xs outline-none text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                id="message-text-input"
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || submittingReply || ticket.status === TicketStatus.CLOSED}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-200 dark:disabled:bg-slate-900 disabled:text-slate-400 text-white p-2.5 rounded transition cursor-pointer"
                id="submit-reply-button"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>

          </div>

          {/* Right column: Action panel, metadata logs, assign managers, auditing logs */}
          <div className="lg:col-span-4 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-850 flex flex-col h-full overflow-hidden">
            
            {/* Scrollable details */}
            <div className="flex-1 p-4 space-y-4 overflow-y-auto custom-scroll">
              
              {/* Assignee management section */}
              {isAgentOrAdmin && (
                <div className="space-y-2 bg-slate-50 dark:bg-slate-950 p-3 rounded border border-slate-200 dark:border-slate-850">
                  <h3 className="text-[10px] font-bold text-slate-500 dark:text-slate-450 uppercase tracking-widest">
                    Manage Case Assignment
                  </h3>
                  
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Assign Support Agent:</label>
                    <select
                      value={ticket.assignedAgent ? ticket.assignedAgent.id : ''}
                      onChange={(e) => handleAssignAgent(e.target.value)}
                      className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-1.5 font-medium focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="">-- Click to Unassign --</option>
                      {agents.map(ag => (
                        <option key={ag.id} value={ag.id}>{ag.fullName}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Basic Meta Summary Cards */}
              <div className="space-y-3">
                <h3 className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-1 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  <span>Ticket Details</span>
                </h3>

                <div className="grid grid-cols-2 gap-3 text-2xs leading-snug">
                  <div>
                    <p className="text-slate-400 font-bold uppercase text-[9px]">Customer Email</p>
                    <p className="font-bold text-slate-850 dark:text-slate-250 truncate select-all">{ticket.customerInfo.email}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-bold uppercase text-[9px]">Created At</p>
                    <p className="font-bold text-slate-850 dark:text-slate-250">{new Date(ticket.creationDate).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-bold uppercase text-[9px]">Status Flag</p>
                    <p className="font-black text-indigo-600 dark:text-indigo-400 uppercase">{ticket.status}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-bold uppercase text-[9px]">Last Modified</p>
                    <p className="font-bold text-slate-850 dark:text-slate-250">{new Date(ticket.lastUpdatedDate).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              {/* Ticket Voucher Generation Tool */}
              <div className="space-y-2 bg-[#F8FAFC] dark:bg-slate-950/60 p-3 rounded border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-1.5 pb-1 border-b border-slate-100 dark:border-slate-900">
                  <Tag className="h-3.5 w-3.5 text-indigo-500" />
                  <h3 className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                    Voucher Generator
                  </h3>
                </div>
                <p className="text-[10px] text-slate-400 leading-normal">
                  Convert this support case into a beautifully formatted customer voucher receipt with physical pass aesthetics, dot tearing lines, verification codes, and barcodes.
                </p>
                <button
                  type="button"
                  onClick={() => setShowVoucher(true)}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-[10px] font-extrabold uppercase text-white bg-indigo-600 hover:bg-indigo-500 rounded shadow-2xs hover:shadow-xs transition cursor-pointer select-none"
                  id="generate-voucher-pass-btn"
                >
                  🎫 Open Voucher Panel
                </button>
              </div>

              {/* Comprehensive Auditing Trail Logs */}
              <div className="space-y-3">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-1 flex items-center gap-1.5">
                  <History className="h-3.5 w-3.5 text-slate-400" />
                  <span>Audit Trail Logs</span>
                </h3>

                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-0.5 flex flex-col gap-1.5 custom-scroll">
                  {auditLogs.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No historical changes audited yet.</p>
                  ) : (
                    auditLogs.map((log) => (
                      <div key={log.id} className="text-xs bg-slate-50 dark:bg-slate-950 p-2 rounded border border-slate-150 dark:border-slate-900 leading-snug">
                        <div className="flex items-center justify-between text-[8px] text-slate-400 mb-0.5 font-mono">
                          <span className="font-bold text-slate-600 dark:text-slate-350">
                            By: {log.performedBy.fullName}
                          </span>
                          <span>
                            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="font-medium text-slate-800 dark:text-slate-200">
                          {log.action}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* Voucher Pass View Overlay Popup */}
        {showVoucher && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-100" id="voucher-overlay">
            <div className="bg-slate-100 dark:bg-slate-900 rounded max-w-sm w-full border border-slate-300 dark:border-slate-800 p-4 shadow-2xl relative flex flex-col gap-3">
              {/* Visual Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                <div className="flex items-center gap-1.5">
                  <Tag className="h-4 w-4 text-indigo-500" />
                  <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">Support Ticket Voucher</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowVoucher(false)}
                  className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-500 transition cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Actual Voucher Card Section with physical aesthetics */}
              <div 
                id="printable-voucher-card"
                className="bg-[#FAFAFA] dark:bg-slate-950 text-slate-800 dark:text-slate-200 border-2 border-dashed border-slate-300 dark:border-slate-800 rounded p-4 relative shadow overflow-hidden"
              >
                {/* Physical Ticket punches side ring notches */}
                <div className="absolute -left-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-slate-950/80 border border-slate-400 dark:border-slate-800 z-10 hidden sm:block"></div>
                <div className="absolute -right-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-slate-950/80 border border-slate-400 dark:border-slate-800 z-10 hidden sm:block"></div>

                {/* Brand header slip */}
                <div className="text-center pb-2.5 border-b-2 border-indigo-600/20 dark:border-indigo-400/20">
                  <p className="text-[8.5px] font-black tracking-widest text-indigo-650 dark:text-indigo-400 uppercase">GLOBAL SUPPORT COMPLAINT WORKORDER</p>
                  <h4 className="text-base font-black uppercase font-mono mt-0.5 text-slate-950 dark:text-white">{ticket.id}</h4>
                  <span className="text-[8px] font-mono bg-slate-200 dark:bg-slate-800 text-slate-650 px-1.5 py-0.2 rounded mt-1 inline-block uppercase font-bold tracking-wider">
                    Official System Coupon Receipt
                  </span>
                </div>

                {/* Priority and Status Accents badges list */}
                <div className="grid grid-cols-2 gap-2 my-2.5 text-center">
                  <div className="bg-slate-100 dark:bg-slate-900 p-1 rounded border border-slate-250 dark:border-slate-850">
                    <span className="block text-[7px] uppercase font-bold text-slate-400">Workflow Status</span>
                    <span className="text-[9.5px] font-black uppercase text-indigo-655 dark:text-indigo-400">{ticket.status}</span>
                  </div>
                  <div className={`p-1 rounded border ${
                    ticket.priority === TicketPriority.CRITICAL ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/40 text-red-650' :
                    ticket.priority === TicketPriority.HIGH ? 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-900/40 text-orange-600' :
                    'bg-slate-100 dark:bg-slate-900 border-slate-250 dark:border-slate-854 text-slate-600'
                  }`}>
                    <span className="block text-[7px] uppercase font-bold text-slate-400">Response Level</span>
                    <span className="text-[9.5px] font-black uppercase">{ticket.priority}</span>
                  </div>
                </div>

                {/* Core Metadata details item */}
                <div className="space-y-2 text-xs text-slate-750 dark:text-slate-350">
                  <div>
                    <span className="block text-[7.5px] uppercase font-bold text-slate-400 mb-0.5">Ticket Subject</span>
                    <p className="font-extrabold text-slate-950 dark:text-white line-clamp-1 leading-normal">{ticket.title}</p>
                  </div>

                  <div>
                    <span className="block text-[7.5px] uppercase font-bold text-slate-400 mb-0.5">Description Abstract</span>
                    <p className="text-[10px] leading-tight text-slate-500 dark:text-slate-400 line-clamp-3 italic">
                      "{ticket.description}"
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-900 grid grid-cols-2 gap-1 text-[10px]">
                    <div>
                      <span className="block text-[7px] uppercase font-bold text-slate-400">Customer Registered</span>
                      <p className="font-bold text-slate-850 dark:text-slate-200 truncate">{ticket.customerInfo.fullName}</p>
                    </div>
                    <div>
                      <span className="block text-[7px] uppercase font-bold text-slate-400">Email Node</span>
                      <p className="font-mono text-[9px] font-bold text-slate-850 dark:text-slate-200 truncate select-all">{ticket.customerInfo.email}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-1 text-[10px] pb-1">
                    <div>
                      <span className="block text-[7px] uppercase font-bold text-slate-400">Callback Line</span>
                      <p className="font-mono font-bold text-slate-850 dark:text-slate-200 truncate">
                        {ticket.customerInfo.contactNumber || 'No Phone Logged'}
                      </p>
                    </div>
                    <div>
                      <span className="block text-[7px] uppercase font-bold text-slate-400">Case Officer Assigned</span>
                      <p className="font-bold text-slate-850 dark:text-slate-200 truncate">
                        {ticket.assignedAgent ? ticket.assignedAgent.fullName : 'UNASSIGNED DEPART'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Splitting dotted coupon tear divider line */}
                <div className="relative my-3">
                  <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t border-dashed border-slate-355 dark:border-slate-800"></div>
                  <span className="relative bg-[#FAFAFA] dark:bg-slate-950 px-2 text-[7.5px] text-slate-400 uppercase font-black tracking-widest block mx-auto text-center w-max select-none">
                    ✂ TEAR OFF SLIP
                  </span>
                </div>

                {/* Bottom portion coupon details and check-in mock barcode */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[9px]">
                    <div>
                      <span className="block text-[7px] uppercase font-bold text-slate-400">Audit Code Tracker</span>
                      <span className="font-mono font-bold">VERIFY-{ticket.id.replace('TKT-', '')}</span>
                    </div>
                    <div className="text-right">
                      <span className="block text-[7px] uppercase font-bold text-slate-400">Dispatched Timestamp</span>
                      <span className="font-mono text-[8px] text-slate-500">{new Date(ticket.creationDate).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Pure HTML Barcode generator */}
                  <div className="space-y-1 mt-1 text-center select-none bg-white p-1.5 rounded border border-slate-200 dark:border-slate-800 flex flex-col items-center">
                    <div className="flex justify-center items-center h-6 gap-[1px] select-none w-full max-w-[210px]">
                      {[2, 1, 3, 2, 1, 4, 1, 2, 3, 1, 2, 4, 1, 2, 1, 3, 2, 1, 4, 1, 2, 3, 1, 1, 2, 3, 1, 2, 4, 1, 1, 2, 1, 3, 1, 1, 2].map((w, index) => (
                        <div key={index} className="bg-slate-950 h-full shrink-0" style={{ width: `${w}px` }} />
                      ))}
                    </div>
                    <p className="text-[7.5px] font-mono tracking-[4px] text-slate-900 uppercase font-black">
                      *TKT-{ticket.id.replace('TKT-', '')}*
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions and Utilities controls */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const printStyle = document.createElement('style');
                    printStyle.id = 'print-voucher-style';
                    printStyle.innerHTML = `
                      @media print {
                        body * {
                          visibility: hidden !important;
                        }
                        #printable-voucher-card, #printable-voucher-card * {
                          visibility: visible !important;
                        }
                        #printable-voucher-card {
                          position: fixed !important;
                          left: 50% !important;
                          top: 45% !important;
                          transform: translate(-50%, -50%) !important;
                          width: 330px !important;
                          border: 2px dashed #000000 !important;
                          box-shadow: none !important;
                          background: #ffffff !important;
                          color: #000000 !important;
                          z-index: 9999999 !important;
                          display: block !important;
                        }
                      }
                    `;
                    document.head.appendChild(printStyle);
                    window.print();
                    setTimeout(() => {
                      const el = document.getElementById('print-voucher-style');
                      if (el) el.remove();
                    }, 1500);
                  }}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-[10px] font-extrabold uppercase bg-indigo-600 hover:bg-indigo-500 text-white rounded transition shadow-2xs select-none cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print Voucher
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const body = `--- TICKET SUPPORT VOUCHER PASS ---\n` +
                                 `Ticket ID: ${ticket.id}\n` +
                                 `Subject: ${ticket.title}\n` +
                                 `Status: ${ticket.status}\n` +
                                 `Priority: ${ticket.priority}\n` +
                                 `Customer: ${ticket.customerInfo.fullName}\n` +
                                 `Email: ${ticket.customerInfo.email}\n` +
                                 `Callback Phone: ${ticket.customerInfo.contactNumber || 'N/A'}\n` +
                                 `Assigned Agent: ${ticket.assignedAgent ? ticket.assignedAgent.fullName : 'Unassigned'}\n` +
                                 `Audit Code Tracker: VERIFY-${ticket.id.replace('TKT-', '')}\n` +
                                 `---------------------------------`;
                    navigator.clipboard.writeText(body);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-[10px] font-extrabold uppercase bg-white dark:bg-slate-900 border border-slate-350 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-950 text-slate-700 dark:text-slate-300 rounded transition shadow-2xs select-none cursor-pointer animate-in fade-in duration-100"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-500 animate-bounce" />
                      <span className="text-emerald-500 font-bold">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Copy Content
                    </>
                  )}
                </button>
              </div>

              {/* Secondary voucher direct-download HTML receipt coupon pass */}
              <button
                type="button"
                onClick={() => {
                  const voucherHtml = `
                    <!DOCTYPE html>
                    <html>
                      <head>
                        <meta charset="utf-8">
                        <title>Support Pass Passcode - ${ticket.id}</title>
                        <style>
                          body {
                            background-color: #f1f5f9;
                            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                            padding: 40px;
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            margin: 0;
                          }
                          .voucher {
                            background-color: #ffffff;
                            max-width: 360px;
                            width: 100%;
                            border: 2px dashed #cbd5e1;
                            border-radius: 8px;
                            padding: 24px;
                            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
                          }
                          .header {
                            text-align: center;
                            padding-bottom: 16px;
                            border-bottom: 2px solid #e2e8f0;
                          }
                          .header h2 { margin: 4px 0; font-size: 20px; font-weight: 800; color: #1e293b; }
                          .header p { font-size: 9px; color: #64748b; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin: 0; }
                          .badge {
                            display: inline-block;
                            font-size: 8px;
                            text-transform: uppercase;
                            padding: 4px 8px;
                            border-radius: 4px;
                            font-weight: 800;
                            margin-top: 8px;
                          }
                          .badge-priority { background-color: #fee2e2; color: #b91c1c; }
                          .badge-status { background-color: #e0e7ff; color: #4338ca; }
                          .meta-section { margin-top: 16px; }
                          .meta-label { font-size: 8px; text-transform: uppercase; color: #94a3b8; font-weight: 800; margin-bottom: 2px; }
                          .meta-value { font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 12px; font-family: inherit; }
                          .divider {
                            border-top: 2px dashed #cbd5e1;
                            text-align: center;
                            margin: 20px 0;
                            position: relative;
                          }
                          .divider span {
                            background-color: #ffffff;
                            padding: 0 8px;
                            font-size: 8px;
                            font-weight: 800;
                            color: #94a3b8;
                            position: absolute;
                            top: -6px;
                            left: 50%;
                            transform: translateX(-50%);
                          }
                          .barcode-container {
                            text-align: center;
                            margin-top: 16px;
                          }
                          .bar-container {
                            display: flex;
                            justify-content: center;
                            height: 36px;
                            gap: 1px;
                          }
                          .bar { background-color: #000000; height: 100%; width: 2px; }
                          .barcode-lbl { font-size: 8px; font-family: monospace; letter-spacing: 4px; font-weight: 700; margin-top: 4px; color: #000000; text-transform: uppercase; }
                        </style>
                      </head>
                      <body>
                        <div class="voucher">
                          <div class="header">
                            <p>AISTUDIO Support Pass Voucher</p>
                            <h2>${ticket.id}</h2>
                            <div style="display: flex; justify-content: center; gap: 8px;">
                              <span class="badge badge-status">${ticket.status}</span>
                              <span class="badge badge-priority">${ticket.priority} Priority</span>
                            </div>
                          </div>
                          <div class="meta-section">
                            <div class="meta-label">Subject Case</div>
                            <div class="meta-value">${ticket.title}</div>
                            
                            <div class="meta-label">Customer Requester</div>
                            <div class="meta-value">${ticket.customerInfo.fullName}</div>
                            
                            <div class="meta-label">Email Node</div>
                            <div class="meta-value">${ticket.customerInfo.email}</div>
                            
                            <div class="meta-label">Callback Line</div>
                            <div class="meta-value">${ticket.customerInfo.contactNumber || 'No Callback Phone'}</div>
                            
                            <div class="meta-label">Assigned Agent</div>
                            <div class="meta-value">${ticket.assignedAgent ? ticket.assignedAgent.fullName : 'Unassigned'}</div>
                          </div>
                          <div class="divider">
                            <span>CUT ALONG LINE</span>
                          </div>
                          <div class="barcode-container">
                            <div class="bar-container">
                              <div class="bar" style="width: 2px;"></div>
                              <div class="bar" style="width: 1px;"></div>
                              <div class="bar" style="width: 3px;"></div>
                              <div class="bar" style="width: 2px;"></div>
                              <div class="bar" style="width: 1px;"></div>
                              <div class="bar" style="width: 4px;"></div>
                              <div class="bar" style="width: 1px;"></div>
                              <div class="bar" style="width: 2px;"></div>
                              <div class="bar" style="width: 3px;"></div>
                              <div class="bar" style="width: 1px;"></div>
                              <div class="bar" style="width: 2px;"></div>
                              <div class="bar" style="width: 4px;"></div>
                              <div class="bar" style="width: 1px;"></div>
                              <div class="bar" style="width: 2px;"></div>
                              <div class="bar" style="width: 1px;"></div>
                              <div class="bar" style="width: 3px;"></div>
                              <div class="bar" style="width: 2px;"></div>
                              <div class="bar" style="width: 1px;"></div>
                              <div class="bar" style="width: 4px;"></div>
                              <div class="bar" style="width: 1px;"></div>
                              <div class="bar" style="width: 2px;"></div>
                              <div class="bar" style="width: 3px;"></div>
                              <div class="bar" style="width: 1px;"></div>
                              <div class="bar" style="width: 1px;"></div>
                              <div class="bar" style="width: 2px;"></div>
                              <div class="bar" style="width: 3px;"></div>
                              <div class="bar" style="width: 1px;"></div>
                              <div class="bar" style="width: 2px;"></div>
                              <div class="bar" style="width: 4px;"></div>
                              <div class="bar" style="width: 1px;"></div>
                              <div class="bar" style="width: 1px;"></div>
                            </div>
                            <div class="barcode-lbl">*TKT-${ticket.id.replace('TKT-', '')}*</div>
                          </div>
                        </div>
                      </body>
                    </html>
                  `;
                  const blob = new Blob([voucherHtml], { type: 'text/html;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.setAttribute('download', `support-voucher-${ticket.id}.html`);
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }}
                className="w-full inline-flex items-center justify-center gap-1 px-3 py-1.5 text-[9.5px] font-black uppercase bg-[#F1F5F9] hover:bg-slate-200 dark:bg-slate-950 dark:hover:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-400 rounded transition select-none cursor-pointer"
                id="download-voucher-html-btn"
              >
                <Download className="h-3 w-3 text-slate-450 dark:text-slate-500" />
                Download Self-Contained Voucher (.HTML)
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
