/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Send, AlertOctagon, HelpCircle } from 'lucide-react';
import { TicketPriority, CustomerInfo } from '../types';

interface NewTicketProps {
  currentUser: { id: string; fullName: string; email: string; role: string; contactNumber?: string };
  onClose: () => void;
  onRefresh: () => void;
}

export function NewTicketModal({ currentUser, onClose, onRefresh }: NewTicketProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TicketPriority>(TicketPriority.MEDIUM);
  
  // Pre-fill customer details automatically if logged in as a Customer, otherwise let Admins type them
  const isCustomer = currentUser.role === 'Customer';
  const [custName, setCustName] = useState(isCustomer ? currentUser.fullName : '');
  const [custEmail, setCustEmail] = useState(isCustomer ? currentUser.email : '');
  const [custPhone, setCustPhone] = useState(isCustomer ? (currentUser.contactNumber || '') : '');

  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText('');

    if (!title.trim() || !description.trim() || !custName.trim() || !custEmail.trim()) {
      setErrorText('Please fill out all mandatory fields: Subject Title, Problem Description, and Customer Profile Name/Email.');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        title: title.trim(),
        description: description.trim(),
        priority,
        customerInfo: {
          fullName: custName.trim(),
          email: custEmail.trim(),
          contactNumber: custPhone.trim() || undefined,
        }
      };

      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Server error occurred during ticket creation');
      }

      onRefresh();
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorText(err.message || 'Fatal error establishing database connection. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-45 p-4" id="new-ticket-modal-overlay">
      <div className="bg-white dark:bg-slate-950 rounded w-full max-w-lg flex flex-col border border-slate-300 dark:border-slate-850 shadow-2xl animate-in fade-in duration-100">
        
        {/* Header bar */}
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-850 flex items-center justify-between bg-slate-50 dark:bg-slate-900 rounded-t">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
            <HelpCircle className="h-4 w-4" />
            <h2 className="text-xs font-extrabold uppercase tracking-widest text-slate-800 dark:text-white">
              Initialize Support Ticket
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-500 transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Input Form Elements */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          
          {errorText && (
            <div className="flex items-start gap-2 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900 p-2.5 rounded text-xs text-rose-700 dark:text-rose-400">
              <AlertOctagon className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{errorText}</span>
            </div>
          )}

          {/* Ticket Title */}
          <div className="space-y-0.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Subject Header Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Redirection loop on logging into accounts portal"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-xs font-medium bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded p-2 text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              required
            />
          </div>

          {/* Details / Issue Description */}
          <div className="space-y-0.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-sans">
              Problem Description Details <span className="text-rose-500">*</span>
            </label>
            <textarea
              placeholder="Provide a comprehensive breakdown of the issues: error logs, replication instructions, browser/OS environments used, and steps you already tried..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full text-xs font-medium bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded p-2 text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              required
            />
          </div>

          {/* Priority options & demographics */}
          <div className="grid grid-cols-2 gap-35">
            <div className="space-y-0.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Indicate System Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TicketPriority)}
                className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded p-2 text-slate-800 dark:text-slate-100 focus:border-indigo-500 focus:outline-none"
              >
                <option value={TicketPriority.LOW}>Low - Generics</option>
                <option value={TicketPriority.MEDIUM}>Medium - Default</option>
                <option value={TicketPriority.HIGH}>High - Escalated</option>
                <option value={TicketPriority.CRITICAL}>Critical - Blocking Outage</option>
              </select>
            </div>

            <div className="space-y-0.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Customer Phone Number
              </label>
              <input
                type="text"
                placeholder="e.g. +1 (555) 781-9900"
                value={custPhone}
                onChange={(e) => setCustPhone(e.target.value)}
                disabled={isCustomer}
                className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded p-2 text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500 disabled:opacity-75 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Customer Demographics: toggleable fields if acting on behalf of customers */}
          {!isCustomer && (
            <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded border border-slate-200 dark:border-slate-850 space-y-2">
              <span className="text-[10px] font-extrabold text-indigo-500 uppercase tracking-widest block">
                Assign Customer Information Profile
              </span>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-0.5">
                  <label className="text-[9px] text-slate-400 font-bold uppercase">Customer Name <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    placeholder="Jane Doe"
                    value={custName}
                    onChange={(e) => setCustName(e.target.value)}
                    className="w-full text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded p-1.5 outline-none focus:border-indigo-500"
                    required
                  />
                </div>
                <div className="space-y-0.5">
                  <label className="text-[9px] text-slate-400 font-bold uppercase">Customer Email <span className="text-rose-500">*</span></label>
                  <input
                    type="email"
                    placeholder="jane.doe@example.com"
                    value={custEmail}
                    onChange={(e) => setCustEmail(e.target.value)}
                    className="w-full text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded p-1.5 outline-none focus:border-indigo-500"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* Form Actions footer */}
          <div className="flex items-center justify-end gap-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-900">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-400 rounded hover:bg-slate-50 dark:hover:bg-slate-900 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold px-3 py-1.5 rounded transition cursor-pointer disabled:bg-slate-200"
            >
              <span>{loading ? 'Submitting...' : 'Create Ticket'}</span>
              <Send className="h-3 w-3" />
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
