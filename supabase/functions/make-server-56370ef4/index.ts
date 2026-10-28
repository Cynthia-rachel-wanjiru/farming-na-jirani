import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";

const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization", "X-Session-Token"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-56370ef4/health", (c) => {
  return c.json({ status: "ok" });
});

const PREFIX = "/make-server-56370ef4";

function generateId() {
  return crypto.randomUUID();
}

function generateToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'farm_echo_salt_v1');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const h = await hashPassword(password);
  return h === hash;
}

async function getSession(c: any) {
  const token = c.req.header('X-Session-Token');
  if (!token) return null;
  const session = await kv.get(`session:${token}`);
  if (!session) return null;
  const user = await kv.get(`user:${session.userId}`);
  if (!user) return null;
  return { session, user, token };
}

async function requireAuth(c: any) {
  const auth = await getSession(c);
  if (!auth) {
    return { error: c.json({ error: "Unauthorized" }, 401), auth: null };
  }
  return { error: null, auth };
}

// Auth routes
app.post(`${PREFIX}/auth/register`, async (c) => {
  try {
    const body = await c.req.json();
    const { fullName, email, phone, password, role = 'farmer' } = body;
    
    if (!email || !password || !fullName) {
      return c.json({ error: "Missing required fields" }, 400);
    }
    
    // Check if user exists
    const existing = await kv.getByPrefix('user:');
    const exists = existing.find((u: any) => u.email === email || u.phone === phone);
    if (exists) {
      return c.json({ error: "User already exists" }, 400);
    }
    
    const userId = generateId();
    const passwordHash = await hashPassword(password);
    const user = {
      id: userId,
      fullName,
      email,
      phone,
      role: role === 'farmer' || role === 'cooperative_leader' || role === 'agricultural_expert' ? role : 'farmer',
      createdAt: new Date().toISOString(),
      profileImage: null,
      location: '',
      farmSize: '',
      crops: [],
      cooperative: ''
    };
    
    await kv.set(`user:${userId}`, user);
    await kv.set(`user_email:${email}`, userId);
    await kv.set(`user_phone:${phone || ''}`, userId);
    await kv.set(`auth:${userId}`, { passwordHash });
    
    const token = generateToken();
    await kv.set(`session:${token}`, { userId, createdAt: new Date().toISOString() });
    
    return c.json({ user, token });
  } catch (e) {
    return c.json({ error: "Registration failed" }, 500);
  }
});

app.post(`${PREFIX}/auth/login`, async (c) => {
  try {
    const body = await c.req.json();
    const { email, password } = body;
    
    if (!email || !password) {
      return c.json({ error: "Missing credentials" }, 400);
    }
    
    const userId = await kv.get(`user_email:${email}`);
    if (!userId) {
      return c.json({ error: "Invalid credentials" }, 401);
    }
    
    const user = await kv.get(`user:${userId}`);
    const auth = await kv.get(`auth:${userId}`);
    
    if (!user || !auth) {
      return c.json({ error: "Invalid credentials" }, 401);
    }
    
    const valid = await verifyPassword(password, auth.passwordHash);
    if (!valid) {
      return c.json({ error: "Invalid credentials" }, 401);
    }
    
    const token = generateToken();
    await kv.set(`session:${token}`, { userId, createdAt: new Date().toISOString() });
    
    return c.json({ user, token });
  } catch (e) {
    return c.json({ error: "Login failed" }, 500);
  }
});

app.post(`${PREFIX}/auth/logout`, async (c) => {
  try {
    const token = c.req.header('X-Session-Token');
    if (token) {
      await kv.del(`session:${token}`);
    }
    return c.json({ success: true });
  } catch (e) {
    return c.json({ success: true });
  }
});

app.get(`${PREFIX}/auth/me`, async (c) => {
  const authRes = await requireAuth(c);
  if (authRes.error) return authRes.error;
  const { user } = authRes.auth;
  return c.json({ user });
});

// Profile routes
app.get(`${PREFIX}/profile`, async (c) => {
  const authRes = await requireAuth(c);
  if (authRes.error) return authRes.error;
  const { user } = authRes.auth;
  return c.json({ user });
});

app.put(`${PREFIX}/profile`, async (c) => {
  const authRes = await requireAuth(c);
  if (authRes.error) return authRes.error;
  const { user, auth: sessionAuth } = authRes.auth;
  try {
    const body = await c.req.json();
    const updated = { ...user, ...body, id: user.id, email: user.email, role: user.role, createdAt: user.createdAt };
    await kv.set(`user:${user.id}`, updated);
    return c.json({ user: updated });
  } catch (e) {
    return c.json({ error: "Failed to update profile" }, 500);
  }
});

// Marketplace routes
app.get(`${PREFIX}/marketplace`, async (c) => {
  try {
    const items = await kv.getByPrefix('listing:');
    return c.json({ listings: items.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) });
  } catch (e) {
    return c.json({ listings: [] });
  }
});

app.post(`${PREFIX}/marketplace`, async (c) => {
  const authRes = await requireAuth(c);
  if (authRes.error) return authRes.error;
  const { user } = authRes.auth;
  try {
    const body = await c.req.json();
    const listingId = generateId();
    const listing = {
      id: listingId,
      ...body,
      sellerId: user.id,
      sellerName: user.fullName,
      sellerPhone: user.phone,
      createdAt: new Date().toISOString(),
      status: 'active'
    };
    await kv.set(`listing:${listingId}`, listing);
    return c.json({ listing });
  } catch (e) {
    return c.json({ error: "Failed to create listing" }, 500);
  }
});

app.put(`${PREFIX}/marketplace/:id`, async (c) => {
  const authRes = await requireAuth(c);
  if (authRes.error) return authRes.error;
  const { user } = authRes.auth;
  const id = c.req.param('id');
  try {
    const existing = await kv.get(`listing:${id}`);
    if (!existing) return c.json({ error: "Not found" }, 404);
    if (existing.sellerId !== user.id && user.role !== 'admin') {
      return c.json({ error: "Unauthorized" }, 403);
    }
    const body = await c.req.json();
    const updated = { ...existing, ...body, id: existing.id, sellerId: existing.sellerId, createdAt: existing.createdAt };
    await kv.set(`listing:${id}`, updated);
    return c.json({ listing: updated });
  } catch (e) {
    return c.json({ error: "Failed to update listing" }, 500);
  }
});

app.delete(`${PREFIX}/marketplace/:id`, async (c) => {
  const authRes = await requireAuth(c);
  if (authRes.error) return authRes.error;
  const { user } = authRes.auth;
  const id = c.req.param('id');
  try {
    const existing = await kv.get(`listing:${id}`);
    if (!existing) return c.json({ error: "Not found" }, 404);
    if (existing.sellerId !== user.id && user.role !== 'admin') {
      return c.json({ error: "Unauthorized" }, 403);
    }
    await kv.del(`listing:${id}`);
    return c.json({ success: true });
  } catch (e) {
    return c.json({ error: "Failed to delete listing" }, 500);
  }
});

// Seedling verification
app.post(`${PREFIX}/seedlings/verify`, async (c) => {
  try {
    const body = await c.req.json();
    const { code } = body;
    if (!code) return c.json({ verified: false, message: "Code required" }, 400);
    const record = await kv.get(`seedling:${code}`);
    if (record) {
      return c.json({ verified: true, ...record });
    }
    return c.json({ verified: false, message: "Invalid or unverified seedling code" });
  } catch (e) {
    return c.json({ verified: false, message: "Verification failed" }, 500);
  }
});

// Conversations/Messaging
app.get(`${PREFIX}/conversations`, async (c) => {
  const authRes = await requireAuth(c);
  if (authRes.error) return authRes.error;
  const { user } = authRes.auth;
  try {
    const all = await kv.getByPrefix('conversation:');
    const userConvos = all.filter((conv: any) => conv.participants && conv.participants.includes(user.id));
    return c.json({ conversations: userConvos });
  } catch (e) {
    return c.json({ conversations: [] });
  }
});

app.post(`${PREFIX}/conversations`, async (c) => {
  const authRes = await requireAuth(c);
  if (authRes.error) return authRes.error;
  const { user } = authRes.auth;
  try {
    const body = await c.req.json();
    const { recipientId } = body;
    if (!recipientId) return c.json({ error: "Recipient required" }, 400);
    const convoId = [user.id, recipientId].sort().join('_');
    const existing = await kv.get(`conversation:${convoId}`);
    if (existing) return c.json({ conversation: existing });
    const conversation = {
      id: convoId,
      participants: [user.id, recipientId],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await kv.set(`conversation:${convoId}`, conversation);
    return c.json({ conversation });
  } catch (e) {
    return c.json({ error: "Failed to create conversation" }, 500);
  }
});

app.get(`${PREFIX}/conversations/:id/messages`, async (c) => {
  const authRes = await requireAuth(c);
  if (authRes.error) return authRes.error;
  const { user } = authRes.auth;
  const id = c.req.param('id');
  try {
    const convo = await kv.get(`conversation:${id}`);
    if (!convo || !convo.participants.includes(user.id)) {
      return c.json({ error: "Unauthorized" }, 403);
    }
    const messages = await kv.getByPrefix(`message:${id}:`);
    messages.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return c.json({ messages });
  } catch (e) {
    return c.json({ messages: [] });
  }
});

app.post(`${PREFIX}/conversations/:id/messages`, async (c) => {
  const authRes = await requireAuth(c);
  if (authRes.error) return authRes.error;
  const { user } = authRes.auth;
  const id = c.req.param('id');
  try {
    const convo = await kv.get(`conversation:${id}`);
    if (!convo || !convo.participants.includes(user.id)) {
      return c.json({ error: "Unauthorized" }, 403);
    }
    const body = await c.req.json();
    const { content } = body;
    if (!content) return c.json({ error: "Content required" }, 400);
    const msgId = generateId();
    const message = {
      id: msgId,
      conversationId: id,
      senderId: user.id,
      senderName: user.fullName,
      content,
      createdAt: new Date().toISOString()
    };
    await kv.set(`message:${id}:${msgId}`, message);
    convo.updatedAt = new Date().toISOString();
    await kv.set(`conversation:${id}`, convo);
    return c.json({ message });
  } catch (e) {
    return c.json({ error: "Failed to send message" }, 500);
  }
});

// Proposals/Voting
app.get(`${PREFIX}/proposals`, async (c) => {
  try {
    const proposals = await kv.getByPrefix('proposal:');
    return c.json({ proposals: proposals.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) });
  } catch (e) {
    return c.json({ proposals: [] });
  }
});

app.post(`${PREFIX}/proposals`, async (c) => {
  const authRes = await requireAuth(c);
  if (authRes.error) return authRes.error;
  const { user } = authRes.auth;
  if (user.role !== 'cooperative_leader' && user.role !== 'admin') {
    return c.json({ error: "Only leaders can create proposals" }, 403);
  }
  try {
    const body = await c.req.json();
    const proposalId = generateId();
    const proposal = {
      id: proposalId,
      ...body,
      createdBy: user.id,
      createdByName: user.fullName,
      createdAt: new Date().toISOString(),
      votesFor: 0,
      votesAgainst: 0,
      voters: []
    };
    await kv.set(`proposal:${proposalId}`, proposal);
    return c.json({ proposal });
  } catch (e) {
    return c.json({ error: "Failed to create proposal" }, 500);
  }
});

app.post(`${PREFIX}/proposals/:id/vote`, async (c) => {
  const authRes = await requireAuth(c);
  if (authRes.error) return authRes.error;
  const { user } = authRes.auth;
  const id = c.req.param('id');
  try {
    const proposal = await kv.get(`proposal:${id}`);
    if (!proposal) return c.json({ error: "Not found" }, 404);
    if (proposal.deadline && new Date() > new Date(proposal.deadline)) {
      return c.json({ error: "Voting closed" }, 400);
    }
    const body = await c.req.json();
    const { vote } = body; // 'for' or 'against'
    if (proposal.voters && proposal.voters.includes(user.id)) {
      return c.json({ error: "Already voted" }, 400);
    }
    if (vote === 'for') proposal.votesFor = (proposal.votesFor || 0) + 1;
    else if (vote === 'against') proposal.votesAgainst = (proposal.votesAgainst || 0) + 1;
    if (!proposal.voters) proposal.voters = [];
    proposal.voters.push(user.id);
    await kv.set(`proposal:${id}`, proposal);
    return c.json({ proposal });
  } catch (e) {
    return c.json({ error: "Failed to vote" }, 500);
  }
});

// Announcements
app.get(`${PREFIX}/announcements`, async (c) => {
  try {
    const announcements = await kv.getByPrefix('announcement:');
    return c.json({ announcements: announcements.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) });
  } catch (e) {
    return c.json({ announcements: [] });
  }
});

app.post(`${PREFIX}/announcements`, async (c) => {
  const authRes = await requireAuth(c);
  if (authRes.error) return authRes.error;
  const { user } = authRes.auth;
  if (user.role !== 'cooperative_leader' && user.role !== 'admin') {
    return c.json({ error: "Only leaders can create announcements" }, 403);
  }
  try {
    const body = await c.req.json();
    const annId = generateId();
    const announcement = {
      id: annId,
      ...body,
      createdBy: user.id,
      createdByName: user.fullName,
      createdAt: new Date().toISOString()
    };
    await kv.set(`announcement:${annId}`, announcement);
    return c.json({ announcement });
  } catch (e) {
    return c.json({ error: "Failed to create announcement" }, 500);
  }
});

// Advisory/Questions
app.get(`${PREFIX}/advisory/questions`, async (c) => {
  const authRes = await requireAuth(c);
  if (authRes.error) return authRes.error;
  const { user } = authRes.auth;
  try {
    const questions = await kv.getByPrefix('advisory:');
    // Experts see all, farmers see their own
    const filtered = user.role === 'agricultural_expert' || user.role === 'admin' 
      ? questions 
      : questions.filter((q: any) => q.farmerId === user.id);
    return c.json({ questions: filtered.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) });
  } catch (e) {
    return c.json({ questions: [] });
  }
});

app.post(`${PREFIX}/advisory/questions`, async (c) => {
  const authRes = await requireAuth(c);
  if (authRes.error) return authRes.error;
  const { user } = authRes.auth;
  try {
    const body = await c.req.json();
    const qId = generateId();
    const question = {
      id: qId,
      ...body,
      farmerId: user.id,
      farmerName: user.fullName,
      status: 'open',
      createdAt: new Date().toISOString(),
      answers: []
    };
    await kv.set(`advisory:${qId}`, question);
    return c.json({ question });
  } catch (e) {
    return c.json({ error: "Failed to submit question" }, 500);
  }
});

app.post(`${PREFIX}/advisory/questions/:id/answer`, async (c) => {
  const authRes = await requireAuth(c);
  if (authRes.error) return authRes.error;
  const { user } = authRes.auth;
  if (user.role !== 'agricultural_expert' && user.role !== 'admin') {
    return c.json({ error: "Only experts can answer" }, 403);
  }
  const id = c.req.param('id');
  try {
    const question = await kv.get(`advisory:${id}`);
    if (!question) return c.json({ error: "Not found" }, 404);
    const body = await c.req.json();
    const answer = {
      id: generateId(),
      content: body.content,
      expertId: user.id,
      expertName: user.fullName,
      createdAt: new Date().toISOString()
    };
    if (!question.answers) question.answers = [];
    question.answers.push(answer);
    question.status = 'answered';
    await kv.set(`advisory:${id}`, question);
    return c.json({ question });
  } catch (e) {
    return c.json({ error: "Failed to answer" }, 500);
  }
});

// Support tickets
app.get(`${PREFIX}/support`, async (c) => {
  const authRes = await requireAuth(c);
  if (authRes.error) return authRes.error;
  const { user } = authRes.auth;
  try {
    const tickets = await kv.getByPrefix('support:');
    const filtered = user.role === 'admin' ? tickets : tickets.filter((t: any) => t.userId === user.id);
    return c.json({ tickets: filtered.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) });
  } catch (e) {
    return c.json({ tickets: [] });
  }
});

app.post(`${PREFIX}/support`, async (c) => {
  const authRes = await requireAuth(c);
  if (authRes.error) return authRes.error;
  const { user } = authRes.auth;
  try {
    const body = await c.req.json();
    const ticketId = generateId();
    const ticket = {
      id: ticketId,
      ...body,
      userId: user.id,
      userName: user.fullName,
      status: 'open',
      createdAt: new Date().toISOString()
    };
    await kv.set(`support:${ticketId}`, ticket);
    return c.json({ ticket });
  } catch (e) {
    return c.json({ error: "Failed to create ticket" }, 500);
  }
});

// AI Chat with Gemini
app.post(`${PREFIX}/ai/chat`, async (c) => {
  const authRes = await requireAuth(c);
  if (authRes.error) return authRes.error;
  try {
    const body = await c.req.json();
    const { messages = [], language = 'en' } = body;
    
    if (!Array.isArray(messages) || messages.length === 0) {
      return c.json({ error: "Messages required" }, 400);
    }
    
    const recentMessages = messages.slice(-10);
    const geminiKey = Deno.env.get('GEMINI_API_KEY');
    
    if (!geminiKey) {
      // Fallback to rule-based
      const lastUserMsg = [...recentMessages].reverse().find((m: any) => m.role === 'user' || m.role === 'human');
      const query = lastUserMsg?.content || '';
      // Simple fallback
      const fallback = language === 'sw' 
        ? "Samahani, huduma ya AI haipatikani kwa sasa. Tafadhali jaribu tena baadaye au wasiliana na mshauri wa kilimo."
        : "I'm currently running in offline mode. Please try again later or consult with a local agricultural officer for assistance.";
      return c.json({ response: fallback, source: 'fallback', model: 'none' });
    }
    
    try {
      // Try Gemini API (current stable API)
      const systemPrompt = language === 'sw'
        ? "Wewe ni mshauri wa kilimo kwa wakulima wadogo wa Kenya. Toa majibu mafupi, yanayofahamika, na yanayoweza kutekelezwa. Zingatia hali ya kilimo Kenya. Uliza maelezo kama mahali, mzazi, dalili au hali ya udongo ikihitajika. Usitoe bei za soko za sasa au utabiri wa hali ya hewa kwa uhakika - sema kutokuwa na uhakika. Pendekeza kushauriana na afisa wa kilimo au mtaalam kwa magonjwa makubwa ya mimea, matumizi ya dawa au afya ya mifugo."
        : "You are a practical farming advisor for Kenyan smallholder farmers. Give short, understandable, actionable answers. Consider Kenyan farming conditions. Ask for missing context like location, crop stage, symptoms, or soil conditions when needed. Do not invent current market prices or weather forecasts - state uncertainty. Recommend consulting a qualified agricultural officer or expert for serious crop disease, pesticide dosage, or livestock health issues. Never claim to have examined crops.";
      
      const contents = [
        { role: 'user', parts: [{ text: systemPrompt + "\n\nConversation:" }] },
        ...recentMessages.map((m: any) => ({
          role: m.role === 'assistant' || m.role === 'model' ? 'model' : 'user',
          parts: [{ text: m.content || '' }]
        }))
      ];
      
      const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents, generationConfig: { temperature: 0.7, maxOutputTokens: 500 } })
      });
      
      if (!resp.ok) {
        const err = await resp.text();
        console.error('Gemini error:', err);
        const fallback = language === 'sw' 
          ? "Samahani, kuna tatizo la kiufundi. Jaribu tena baada ya muda mfupi."
          : "Sorry, there was a technical issue. Please try again shortly.";
        return c.json({ response: fallback, source: 'fallback', error: true });
      }
      
      const data = await resp.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (!text) {
        const fallback = language === 'sw' 
          ? "Samahani, sijapata jibu. Tafadhali jaribu tena."
          : "Sorry, I couldn't generate a response. Please try again.";
        return c.json({ response: fallback, source: 'fallback', error: true });
      }
      return c.json({ response: text, source: 'gemini', model: 'gemini-1.5-flash' });
    } catch (e) {
      console.error('AI error:', e);
      const fallback = language === 'sw' 
        ? "Samahani, kuna tatizo. Jaribu tena baadaye."
        : "Sorry, there was an error. Please try again later.";
      return c.json({ response: fallback, source: 'fallback', error: true });
    }
  } catch (e) {
    return c.json({ error: "AI request failed" }, 500);
  }
});

Deno.serve(app.fetch);