/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { DBService } from './src/db/dbService';
import { UserRole, TicketStatus, TicketPriority } from './src/types';

const app = express();
const PORT = 3000;

// Initialize the Google Gen AI client lazily
let aiClient: any = null;
function getAiClient() {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (key && key !== 'MY_GEMINI_API_KEY') {
      aiClient = new GoogleGenAI({ apiKey: key });
    }
  }
  return aiClient;
}

// Global middlewares
app.use(express.json());

// Log incoming API requests for robust debugging
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    console.log(`[API REQUEST] ${req.method} ${req.path}`);
  }
  next();
});

// --- AUTHENTICATION & SESSION SIMULATION ---

// Post registration
app.post('/api/auth/register', (req, res) => {
  const { fullName, email, role, contactNumber } = req.body;
  if (!fullName || !email || !role) {
    return res.status(400).json({ error: 'Full Name, Email and Role are required parameters.' });
  }

  try {
    const roleEnum = role as UserRole;
    const user = DBService.createUser(fullName, email, roleEnum, contactNumber || '');
    return res.status(201).json(user);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Registration failed.' });
  }
});

// Post login (returns the profile of the user based on email)
app.post('/api/auth/login', (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email parameter is required.' });
  }

  const user = DBService.getUserByEmail(email);
  if (!user) {
    return res.status(404).json({ error: 'No user registered with this email address.' });
  }

  return res.json({
    message: 'Login successful',
    user,
    token: `mock-jwt-token-for-${user.id}`,
  });
});

// --- USER MANAGEMENT ---

app.get('/api/users', (req, res) => {
  const { role } = req.query;
  let users = DBService.getUsers();

  if (role) {
    users = users.filter(u => u.role.toLowerCase() === (role as string).toLowerCase());
  }

  return res.json(users);
});

app.get('/api/users/:id', (req, res) => {
  const user = DBService.getUserById(req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }
  return res.json(user);
});

// --- SUPPORT TICKETS REST CRUD ---

// GET Support Tickets with robust search & filtering
app.get('/api/tickets', (req, res) => {
  const { search, customer, status, priority, agentId, dateAfter } = req.query;
  let tickets = DBService.getTickets();

  // Search by title or description
  if (search) {
    const query = (search as string).toLowerCase();
    tickets = tickets.filter(t => 
      t.title.toLowerCase().includes(query) || 
      t.description.toLowerCase().includes(query) ||
      t.id.toLowerCase().includes(query)
    );
  }

  // Filter or search by customer name/email
  if (customer) {
    const query = (customer as string).toLowerCase();
    tickets = tickets.filter(t => 
      t.customerInfo.fullName.toLowerCase().includes(query) || 
      t.customerInfo.email.toLowerCase().includes(query)
    );
  }

  // Filter by status (Open, In Progress, Resolved, Closed)
  if (status) {
    const statuses = (status as string).split(',');
    tickets = tickets.filter(t => statuses.includes(t.status));
  }

  // Filter by priority (Low, Medium, High, Critical)
  if (priority) {
    const priorities = (priority as string).split(',');
    tickets = tickets.filter(t => priorities.includes(t.priority));
  }

  // Filter by assigned agent id
  if (agentId) {
    if (agentId === 'none') {
      tickets = tickets.filter(t => t.assignedAgent === null);
    } else {
      tickets = tickets.filter(t => t.assignedAgent?.id === agentId);
    }
  }

  // Filter by date created (after specified ISO timestamp)
  if (dateAfter) {
    const limitDate = new Date(dateAfter as string).getTime();
    tickets = tickets.filter(t => new Date(t.creationDate).getTime() >= limitDate);
  }

  // Sort: show high priority/recent first by default
  tickets = tickets.sort((a, b) => new Date(b.creationDate).getTime() - new Date(a.creationDate).getTime());

  return res.json(tickets);
});

// GET single support ticket detail with replies and logs
app.get('/api/tickets/:id', (req, res) => {
  const ticket = DBService.getTicketById(req.params.id);
  if (!ticket) {
    return res.status(404).json({ error: `Ticket with ID ${req.params.id} does not exist.` });
  }

  const replies = DBService.getReplies(ticket.id);
  const auditLogs = DBService.getAuditLogs(ticket.id);

  return res.json({
    ...ticket,
    replies,
    auditLogs
  });
});

// POST create ticket
app.post('/api/tickets', (req, res) => {
  const { title, description, customerInfo, priority } = req.body;
  if (!title || !description || !customerInfo || !customerInfo.fullName || !customerInfo.email) {
    return res.status(400).json({ 
      error: 'Missing required fields. Title, Description, and Customer full name + email are mandatory.' 
    });
  }

  try {
    const cleanPriority = (priority as TicketPriority) || TicketPriority.MEDIUM;
    const ticket = DBService.createTicket(title, description, customerInfo, cleanPriority);
    return res.status(201).json(ticket);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to create ticket.' });
  }
});

// PUT full ticket updates (Manager update)
app.put('/api/tickets/:id', (req, res) => {
  const { performerName, performerRole, ...updates } = req.body;
  if (!performerName || !performerRole) {
    return res.status(400).json({ error: 'Performer information (fullName & role) is required for log tracking.' });
  }

  try {
    const updatedTicket = DBService.updateTicket(req.params.id, updates, performerName, performerRole as UserRole);
    return res.json(updatedTicket);
  } catch (error: any) {
    return res.status(404).json({ error: error.message });
  }
});

// PUT status workflow state specifically
app.put('/api/tickets/:id/status', (req, res) => {
  const { status, performerName, performerRole } = req.body;
  if (!status || !performerName || !performerRole) {
    return res.status(400).json({ error: 'Missing status or performer info parameters.' });
  }

  try {
    const updatedTicket = DBService.updateTicket(
      req.params.id, 
      { status: status as TicketStatus }, 
      performerName, 
      performerRole as UserRole
    );
    return res.json(updatedTicket);
  } catch (error: any) {
    return res.status(404).json({ error: error.message });
  }
});

// PUT assignment workflow
app.put('/api/tickets/:id/assign', (req, res) => {
  const { agentId, performerName, performerRole } = req.body;
  if (!performerName || !performerRole) {
    return res.status(400).json({ error: 'Performer info is required.' });
  }

  try {
    let assignedAgent = null;
    if (agentId) {
      const agent = DBService.getUserById(agentId);
      if (!agent || (agent.role !== UserRole.AGENT && agent.role !== UserRole.ADMIN)) {
        return res.status(400).json({ error: 'Valid agent must be selected for assignment.' });
      }
      assignedAgent = {
        id: agent.id,
        fullName: agent.fullName,
        email: agent.email
      };
    }

    const updatedTicket = DBService.updateTicket(
      req.params.id, 
      { assignedAgent }, 
      performerName, 
      performerRole as UserRole
    );
    return res.json(updatedTicket);
  } catch (error: any) {
    return res.status(404).json({ error: error.message });
  }
});

// --- REPLIES CONVERSATION ---

// GET ticket replies
app.get('/api/tickets/:id/replies', (req, res) => {
  try {
    const replies = DBService.getReplies(req.params.id);
    return res.json(replies);
  } catch (error: any) {
    return res.status(404).json({ error: error.message });
  }
});

// POST add ticket reply
app.post('/api/tickets/:id/replies', (req, res) => {
  const { message, sender } = req.body;
  if (!message || !sender || !sender.id || !sender.fullName || !sender.role) {
    return res.status(400).json({ error: 'Message content and sender context parameters are mandatory.' });
  }

  try {
    const newReply = DBService.addReply(req.params.id, message, sender);
    return res.status(201).json(newReply);
  } catch (error: any) {
    return res.status(404).json({ error: error.message });
  }
});

// --- DASHBOARD API STATISTICS ---

app.get('/api/dashboard/stats', (req, res) => {
  const stats = DBService.getStats();
  return res.json(stats);
});

// --- AI SUGGESTIONS ENDPOINT (SERVER-SIDE GEMINI) ---

app.post('/api/tickets/:id/ai-suggest', async (req, res) => {
  const ticketId = req.params.id;
  const ticket = DBService.getTicketById(ticketId);
  if (!ticket) {
    return res.status(404).json({ error: 'Ticket not found' });
  }

  const ai = getAiClient();
  if (!ai) {
    return res.status(503).json({ 
      error: 'AI suggestions are unavailable because GEMINI_API_KEY is not configured or invalid. Please add the secret or verify key configuration.',
      isConfigured: false
    });
  }

  try {
    const replies = DBService.getReplies(ticketId);
    
    // Construct the context prompt containing ticket details and actual message chain
    const conversationText = replies.map(r => `${r.senderInfo.fullName} (${r.senderInfo.role}): "${r.message}"`).join('\n');
    
    const prompt = `
You are an expert Customer Support Tier-3 Technical Lead advisor acting within a CRM ticketing workspace.
Please analyze the following support ticket and its recent message history. Provide:
1. A concise 2-sentence summary of the core technical or business obstacle.
2. An actionable, bulleted next-step recommendation (max 3 items) for the active support agent Emma or Liam to resolve the consumer query.
3. A friendly, high-quality, professional proposed draft message the agent can review and directly send back to the customer.

Ticket Context:
==================================
ID: ${ticket.id}
Title: ${ticket.title}
Customer: ${ticket.customerInfo.fullName} (${ticket.customerInfo.email})
Priority: ${ticket.priority}
Status: ${ticket.status}
Original Issue Description: 
"${ticket.description}"

Conversation History:
==================================
${conversationText || 'No custom agent replies exchanged yet.'}

Output your response cleanly format in simple Markdown without self-mention. Make sure it is highly empathetic, technical, and accurate.
`;

    // Modern Gemini 2.5 Flash setup
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return res.json({
      suggestion: response.text,
      isConfigured: true
    });
  } catch (error: any) {
    console.error('Gemini API execution error:', error);
    return res.status(500).json({ 
      error: 'An error occurred while calling the Gemini API services: ' + error.message,
      isConfigured: true
    });
  }
});


// --- VITE MIDDLEWARE SETUP & INGRESS HANDLERS ---

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    // Development mode with Vite server middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production statics
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Express ticket management backend server successfully listening on port ${PORT}`);
    console.log(`Developer workspace running on http://localhost:${PORT}`);
  });
}

startServer();
