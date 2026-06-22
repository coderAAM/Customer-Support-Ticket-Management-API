/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import { User, SupportTicket, TicketReply, AuditLog, UserRole, TicketStatus, TicketPriority, DashboardStats } from '../types';

interface DatabaseSchema {
  users: User[];
  tickets: SupportTicket[];
  replies: TicketReply[];
  auditLogs: AuditLog[];
}

const DB_FILE_PATH = path.join(process.cwd(), 'tickets_db.json');

// Helper to calculate ISO timestamps relative to current time
function getRelativeDateString(daysAgo: number, hoursAgo = 0): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(date.getHours() - hoursAgo);
  return date.toISOString();
}

const DEFAULT_USERS: User[] = [
  {
    id: 'usr-admin',
    fullName: 'Sarah Jenkins',
    email: 'admin@ticketcorp.com',
    role: UserRole.ADMIN,
    contactNumber: '+1 (555) 019-2834',
    registrationDate: getRelativeDateString(30),
  },
  {
    id: 'usr-agent1',
    fullName: 'Liam Carter',
    email: 'liam.agent@ticketcorp.com',
    role: UserRole.AGENT,
    contactNumber: '+1 (555) 014-9922',
    registrationDate: getRelativeDateString(25),
  },
  {
    id: 'usr-agent2',
    fullName: 'Emma Watson',
    email: 'emma.agent@ticketcorp.com',
    role: UserRole.AGENT,
    contactNumber: '+1 (555) 012-8811',
    registrationDate: getRelativeDateString(20),
  },
  {
    id: 'usr-customer1',
    fullName: 'Donald Miller',
    email: 'donald@gmail.com',
    role: UserRole.CUSTOMER,
    contactNumber: '+1 (555) 018-4499',
    registrationDate: getRelativeDateString(15),
  },
  {
    id: 'usr-customer2',
    fullName: 'Alice Robinson',
    email: 'alice@example.com',
    role: UserRole.CUSTOMER,
    contactNumber: '+1 (555) 013-7766',
    registrationDate: getRelativeDateString(10),
  },
];

const DEFAULT_TICKETS: SupportTicket[] = [
  {
    id: 'TKT-1001',
    title: 'Unable to access billing history panel',
    description: 'When I click on the "Billing History" menu in my account settings, the page keeps loading forever and eventually throws a timeout error. I tried clearing browser cache but it did not resolve.',
    customerInfo: {
      fullName: 'Donald Miller',
      email: 'donald@gmail.com',
      contactNumber: '+1 (555) 018-4499',
    },
    assignedAgent: {
      id: 'usr-agent2',
      fullName: 'Emma Watson',
      email: 'emma.agent@ticketcorp.com',
    },
    status: TicketStatus.OPEN,
    priority: TicketPriority.HIGH,
    creationDate: getRelativeDateString(2, 4),
    lastUpdatedDate: getRelativeDateString(1, 2),
  },
  {
    id: 'TKT-1002',
    title: 'SSO login authentication error',
    description: 'Our organization users are unable to authenticate using Okta SSO today. It yields a SAML redirection error. Need immediate help as 40 users are blocked.',
    customerInfo: {
      fullName: 'Alice Robinson',
      email: 'alice@example.com',
      contactNumber: '+1 (555) 013-7766',
    },
    assignedAgent: {
      id: 'usr-agent1',
      fullName: 'Liam Carter',
      email: 'liam.agent@ticketcorp.com',
    },
    status: TicketStatus.IN_PROGRESS,
    priority: TicketPriority.CRITICAL,
    creationDate: getRelativeDateString(1, 8),
    lastUpdatedDate: getRelativeDateString(0, 1),
  },
  {
    id: 'TKT-1003',
    title: 'API Authentication failing on /v2/endpoints',
    description: 'We migrated our client script to hit the new v2 endpoints, but every request returns a 401 Unauthorized, despite using the exact same Bearer token that works on the old v1 endpoints. Is there a different signature required?',
    customerInfo: {
      fullName: 'Donald Miller',
      email: 'donald@gmail.com',
      contactNumber: '+1 (555) 018-4499',
    },
    assignedAgent: null,
    status: TicketStatus.OPEN,
    priority: TicketPriority.MEDIUM,
    creationDate: getRelativeDateString(3, 1),
    lastUpdatedDate: getRelativeDateString(3, 1),
  },
  {
    id: 'TKT-1004',
    title: 'Reset password link not working',
    description: 'I click the reset my password button but I never get the email. I checked spam and trash folders but still nothing.',
    customerInfo: {
      fullName: 'Alice Robinson',
      email: 'alice@example.com',
      contactNumber: '+1 (555) 013-7766',
    },
    assignedAgent: {
      id: 'usr-agent2',
      fullName: 'Emma Watson',
      email: 'emma.agent@ticketcorp.com',
    },
    status: TicketStatus.RESOLVED,
    priority: TicketPriority.LOW,
    creationDate: getRelativeDateString(4, 5),
    lastUpdatedDate: getRelativeDateString(3, 2),
  },
  {
    id: 'TKT-1005',
    title: 'Billing subscription charge query',
    description: 'I was billed twice on my renewal invoice this month. Could you check and issue a refund for the second pending transaction?',
    customerInfo: {
      fullName: 'Donald Miller',
      email: 'donald@gmail.com',
      contactNumber: '+1 (555) 018-4499',
    },
    assignedAgent: {
      id: 'usr-agent2',
      fullName: 'Emma Watson',
      email: 'emma.agent@ticketcorp.com',
    },
    status: TicketStatus.CLOSED,
    priority: TicketPriority.MEDIUM,
    creationDate: getRelativeDateString(6, 12),
    lastUpdatedDate: getRelativeDateString(5, 4),
  },
];

const DEFAULT_REPLIES: TicketReply[] = [
  {
    id: 'rep-1',
    ticketId: 'TKT-1001',
    message: 'Hello Donald! I am Emma and will be looking in to your billing page issues. To investigate deeper, can you please capture the console error logs from your developer tools or confirm which browser you are utilizing?',
    senderInfo: {
      id: 'usr-agent2',
      fullName: 'Emma Watson',
      email: 'emma.agent@ticketcorp.com',
      role: UserRole.AGENT,
    },
    timestamp: getRelativeDateString(1, 10),
  },
  {
    id: 'rep-2',
    ticketId: 'TKT-1001',
    message: 'Thanks Emma. I am using Google Chrome Version 118. In the dev tools console, I see an error: "Failed to load resource: net::ERR_CONNECTION_TIMED_OUT" pointing to the API gateway billing route.',
    senderInfo: {
      id: 'usr-customer1',
      fullName: 'Donald Miller',
      email: 'donald@gmail.com',
      role: UserRole.CUSTOMER,
    },
    timestamp: getRelativeDateString(1, 2),
  },
  {
    id: 'rep-3',
    ticketId: 'TKT-1002',
    message: 'Hello Alice, Liam here. I am prioritizing this Okta SSO issue. I am checking our provider logs right now. Could you please double check if any signing certificate was updated on your Okta portal recently?',
    senderInfo: {
      id: 'usr-agent1',
      fullName: 'Liam Carter',
      email: 'liam.agent@ticketcorp.com',
      role: UserRole.AGENT,
    },
    timestamp: getRelativeDateString(1, 6),
  },
  {
    id: 'rep-4',
    ticketId: 'TKT-1002',
    message: 'Indeed we did update the single sign-on certificate yes! Could that prevent users from authenticating on your end? Can we upload the new metadata document to you?',
    senderInfo: {
      id: 'usr-customer2',
      fullName: 'Alice Robinson',
      email: 'alice@example.com',
      role: UserRole.CUSTOMER,
    },
    timestamp: getRelativeDateString(0, 5),
  },
  {
    id: 'rep-5',
    ticketId: 'TKT-1002',
    message: 'Yes! That is precisely the cause of the SAML signature validation mismatch. Please paste the text or email it. Let me update the metadata parameter for your tenant connection.',
    senderInfo: {
      id: 'usr-agent1',
      fullName: 'Liam Carter',
      email: 'liam.agent@ticketcorp.com',
      role: UserRole.AGENT,
    },
    timestamp: getRelativeDateString(0, 1),
  },
  {
    id: 'rep-6',
    ticketId: 'TKT-1004',
    message: 'Hi Alice, I see that our email server completed delivery for the reset password to alice@example.com at 11:22 AM. Could you check your secondary promotions tab or ensure your mail filter is not blocking noreply@ticketcorp.com?',
    senderInfo: {
      id: 'usr-agent2',
      fullName: 'Emma Watson',
      email: 'emma.agent@ticketcorp.com',
      role: UserRole.AGENT,
    },
    timestamp: getRelativeDateString(4, 2),
  },
  {
    id: 'rep-7',
    ticketId: 'TKT-1004',
    message: 'Ah! Found it inside my organization Junk settings. Clicking it works now, password is reset successfully. Close the ticket, thanks Emma!',
    senderInfo: {
      id: 'usr-customer2',
      fullName: 'Alice Robinson',
      email: 'alice@example.com',
      role: UserRole.CUSTOMER,
    },
    timestamp: getRelativeDateString(3, 4),
  },
  {
    id: 'rep-8',
    ticketId: 'TKT-1004',
    message: 'You are very welcome! Marking this ticket as Resolved. Stay safe!',
    senderInfo: {
      id: 'usr-agent2',
      fullName: 'Emma Watson',
      email: 'emma.agent@ticketcorp.com',
      role: UserRole.AGENT,
    },
    timestamp: getRelativeDateString(3, 2),
  },
  {
    id: 'rep-9',
    ticketId: 'TKT-1005',
    message: 'Hi Donald, Emma here. I reviewed the billing systems; the duplicate invoice charges were processed in error because of a card processing retry. I initiated a direct refund of $49.00 today. The fund should appear in your card balance in 3-5 business days.',
    senderInfo: {
      id: 'usr-agent2',
      fullName: 'Emma Watson',
      email: 'emma.agent@ticketcorp.com',
      role: UserRole.AGENT,
    },
    timestamp: getRelativeDateString(5, 10),
  },
  {
    id: 'rep-10',
    ticketId: 'TKT-1005',
    message: 'Wonderful! Received the refund confirmation. I will consider this resolved. Thanks spectacular Emma.',
    senderInfo: {
      id: 'usr-customer1',
      fullName: 'Donald Miller',
      email: 'donald@gmail.com',
      role: UserRole.CUSTOMER,
    },
    timestamp: getRelativeDateString(5, 5),
  },
];

const DEFAULT_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'log-1',
    ticketId: 'TKT-1001',
    action: 'Ticket Created',
    performedBy: { fullName: 'Donald Miller', role: UserRole.CUSTOMER },
    timestamp: getRelativeDateString(2, 4),
  },
  {
    id: 'log-2',
    ticketId: 'TKT-1001',
    action: 'Ticket Assigned to Emma Watson',
    performedBy: { fullName: 'Sarah Jenkins', role: UserRole.ADMIN },
    timestamp: getRelativeDateString(2, 2),
  },
  {
    id: 'log-3',
    ticketId: 'TKT-1002',
    action: 'Ticket Created',
    performedBy: { fullName: 'Alice Robinson', role: UserRole.CUSTOMER },
    timestamp: getRelativeDateString(1, 8),
  },
  {
    id: 'log-4',
    ticketId: 'TKT-1002',
    action: 'Ticket Assigned to Liam Carter',
    performedBy: { fullName: 'Liam Carter', role: UserRole.AGENT },
    timestamp: getRelativeDateString(1, 7),
  },
  {
    id: 'log-5',
    ticketId: 'TKT-1002',
    action: 'Status Updated to In Progress',
    performedBy: { fullName: 'Liam Carter', role: UserRole.AGENT },
    timestamp: getRelativeDateString(1, 6),
  },
  {
    id: 'log-6',
    ticketId: 'TKT-1004',
    action: 'Status Updated to Resolved',
    performedBy: { fullName: 'Emma Watson', role: UserRole.AGENT },
    timestamp: getRelativeDateString(3, 2),
  },
  {
    id: 'log-7',
    ticketId: 'TKT-1005',
    action: 'Status Updated to Closed',
    performedBy: { fullName: 'Emma Watson', role: UserRole.AGENT },
    timestamp: getRelativeDateString(5, 4),
  },
];

export class DBService {
  private static initDB() {
    if (!fs.existsSync(DB_FILE_PATH)) {
      const data: DatabaseSchema = {
        users: DEFAULT_USERS,
        tickets: DEFAULT_TICKETS,
        replies: DEFAULT_REPLIES,
        auditLogs: DEFAULT_AUDIT_LOGS,
      };
      fs.writeFileSync(DB_FILE_PATH, JSON.stringify(data, null, 2), 'utf8');
    }
  }

  private static loadDB(): DatabaseSchema {
    this.initDB();
    try {
      const content = fs.readFileSync(DB_FILE_PATH, 'utf8');
      return JSON.parse(content);
    } catch (e) {
      console.error('Error reading JSON DB file, resetting default data', e);
      const data: DatabaseSchema = {
        users: DEFAULT_USERS,
        tickets: DEFAULT_TICKETS,
        replies: DEFAULT_REPLIES,
        auditLogs: DEFAULT_AUDIT_LOGS,
      };
      return data;
    }
  }

  private static saveDB(data: DatabaseSchema) {
    try {
      fs.writeFileSync(DB_FILE_PATH, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
      console.error('Error writing to JSON DB file', e);
    }
  }

  // --- Users Service ---
  public static getUsers(): User[] {
    const db = this.loadDB();
    return db.users;
  }

  public static getUserById(id: string): User | undefined {
    return this.getUsers().find(u => u.id === id);
  }

  public static getUserByEmail(email: string): User | undefined {
    return this.getUsers().find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  public static createUser(fullName: string, email: string, role: UserRole, contactNumber: string): User {
    const db = this.loadDB();
    const existing = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      return existing;
    }

    const newUser: User = {
      id: `usr-${Math.random().toString(36).substr(2, 9)}`,
      fullName,
      email,
      role,
      contactNumber,
      registrationDate: new Date().toISOString(),
    };

    db.users.push(newUser);
    this.saveDB(db);
    return newUser;
  }

  // --- Support Tickets Service ---
  public static getTickets(): SupportTicket[] {
    const db = this.loadDB();
    return db.tickets;
  }

  public static getTicketById(id: string): SupportTicket | undefined {
    return this.getTickets().find(t => t.id === id);
  }

  public static createTicket(title: string, description: string, customer: { fullName: string; email: string; contactNumber?: string }, priority: TicketPriority = TicketPriority.MEDIUM): SupportTicket {
    const db = this.loadDB();

    // Generate Ticket Code (e.g., TKT-1006)
    const nextNum = db.tickets.length > 0 
      ? Math.max(...db.tickets.map(t => {
          const match = t.id.match(/TKT-(\d+)/);
          return match ? parseInt(match[1]) : 1000;
        })) + 1
      : 1001;

    const newTicket: SupportTicket = {
      id: `TKT-${nextNum}`,
      title,
      description,
      customerInfo: customer,
      assignedAgent: null,
      status: TicketStatus.OPEN,
      priority,
      creationDate: new Date().toISOString(),
      lastUpdatedDate: new Date().toISOString(),
    };

    db.tickets.push(newTicket);
    this.saveDB(db);

    // Initial audit log
    this.createAuditLog(newTicket.id, 'Ticket Created', {
      fullName: customer.fullName,
      role: UserRole.CUSTOMER
    });

    return newTicket;
  }

  public static updateTicket(id: string, updates: Partial<SupportTicket>, performerName: string, performerRole: UserRole): SupportTicket {
    const db = this.loadDB();
    const ticketIdx = db.tickets.findIndex(t => t.id === id);
    if (ticketIdx === -1) {
      throw new Error(`Ticket with ID ${id} not found.`);
    }

    const oldTicket = db.tickets[ticketIdx];
    const updatedTicket = {
      ...oldTicket,
      ...updates,
      lastUpdatedDate: new Date().toISOString(),
    };

    db.tickets[ticketIdx] = updatedTicket;
    this.saveDB(db);

    // Create Audit Logs for key changes
    if (updates.status && updates.status !== oldTicket.status) {
      this.createAuditLog(id, `Status updated to ${updates.status}`, {
        fullName: performerName,
        role: performerRole,
      });
    }

    if (updates.priority && updates.priority !== oldTicket.priority) {
      this.createAuditLog(id, `Priority updated to ${updates.priority}`, {
        fullName: performerName,
        role: performerRole,
      });
    }

    if (updates.assignedAgent !== undefined) {
      const oldAgent = oldTicket.assignedAgent;
      const newAgent = updates.assignedAgent;
      if (oldAgent?.id !== newAgent?.id) {
        const actionStr = newAgent 
          ? `Ticket assigned to ${newAgent.fullName}`
          : `Ticket unassigned`;
        this.createAuditLog(id, actionStr, {
          fullName: performerName,
          role: performerRole,
        });
      }
    }

    return updatedTicket;
  }

  // --- Ticket Replies Service ---
  public static getReplies(ticketId: string): TicketReply[] {
    const db = this.loadDB();
    return db.replies.filter(r => r.ticketId === ticketId).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  public static addReply(ticketId: string, message: string, sender: { id: string; fullName: string; email: string; role: UserRole }): TicketReply {
    const db = this.loadDB();

    // Verify ticket exists
    const ticket = db.tickets.find(t => t.id === ticketId);
    if (!ticket) {
      throw new Error(`Ticket with ID ${ticketId} not found.`);
    }

    const newReply: TicketReply = {
      id: `rep-${Math.random().toString(36).substr(2, 9)}`,
      ticketId,
      message,
      senderInfo: sender,
      timestamp: new Date().toISOString(),
    };

    db.replies.push(newReply);

    // Update ticket lastUpdatedDate
    ticket.lastUpdatedDate = new Date().toISOString();
    
    // Auto status progression: if is in progress or resolved/closed, replying can adjust status
    // If agent replies, we can auto progress status to In Progress (if it was Open)
    if (sender.role === UserRole.AGENT || sender.role === UserRole.ADMIN) {
      if (ticket.status === TicketStatus.OPEN) {
        ticket.status = TicketStatus.IN_PROGRESS;
        this.createAuditLog(ticketId, 'Status updated to In Progress (Auto-assigned on reply)', {
          fullName: sender.fullName,
          role: sender.role,
        });
      }
    }

    this.saveDB(db);
    return newReply;
  }

  // --- Audit Logs Service ---
  public static getAuditLogs(ticketId: string): AuditLog[] {
    const db = this.loadDB();
    return db.auditLogs.filter(l => l.ticketId === ticketId).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  public static createAuditLog(ticketId: string, action: string, performer: { fullName: string; role: UserRole }): AuditLog {
    const db = this.loadDB();
    const newLog: AuditLog = {
      id: `log-${Math.random().toString(36).substr(2, 9)}`,
      ticketId,
      action,
      performedBy: performer,
      timestamp: new Date().toISOString(),
    };
    db.auditLogs.push(newLog);
    this.saveDB(db);
    return newLog;
  }

  // --- Dashboard Stats Service ---
  public static getStats(): DashboardStats {
    const tickets = this.getTickets();
    const users = this.getUsers();

    return {
      totalTickets: tickets.length,
      openTickets: tickets.filter(t => t.status === TicketStatus.OPEN).length,
      inProgressTickets: tickets.filter(t => t.status === TicketStatus.IN_PROGRESS).length,
      resolvedTickets: tickets.filter(t => t.status === TicketStatus.RESOLVED).length,
      closedTickets: tickets.filter(t => t.status === TicketStatus.CLOSED).length,
      activeAgents: users.filter(u => u.role === UserRole.AGENT || u.role === UserRole.ADMIN).length,
    };
  }
}
