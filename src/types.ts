/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum UserRole {
  CUSTOMER = 'Customer',
  AGENT = 'Agent',
  ADMIN = 'Admin',
}

export enum TicketStatus {
  OPEN = 'Open',
  IN_PROGRESS = 'In Progress',
  RESOLVED = 'Resolved',
  CLOSED = 'Closed',
}

export enum TicketPriority {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
  CRITICAL = 'Critical',
}

export interface User {
  id: string; // unique identifier
  fullName: string;
  email: string;
  role: UserRole;
  contactNumber: string;
  registrationDate: string; // ISO timestamp
}

export interface CustomerInfo {
  fullName: string;
  email: string;
  contactNumber?: string;
}

export interface AssignedAgentInfo {
  id: string;
  fullName: string;
  email: string;
}

export interface SupportTicket {
  id: string; // e.g. TKT-1001
  title: string;
  description: string;
  customerInfo: CustomerInfo;
  assignedAgent: AssignedAgentInfo | null;
  status: TicketStatus;
  priority: TicketPriority;
  creationDate: string; // ISO timestamp
  lastUpdatedDate: string; // ISO timestamp
}

export interface TicketReply {
  id: string;
  ticketId: string; // Ticket Reference
  message: string;
  senderInfo: {
    id: string;
    fullName: string;
    email: string;
    role: UserRole;
  };
  timestamp: string; // ISO timestamp
}

export interface AuditLog {
  id: string;
  ticketId: string;
  action: string; // e.g. "Status Updated to Resolved", "Assigned to John Doe"
  performedBy: {
    fullName: string;
    role: UserRole;
  };
  timestamp: string;
}

export interface DashboardStats {
  totalTickets: number;
  openTickets: number;
  inProgressTickets: number;
  resolvedTickets: number;
  closedTickets: number;
  activeAgents: number;
}
