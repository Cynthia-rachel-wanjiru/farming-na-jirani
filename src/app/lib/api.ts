import { projectId, publicAnonKey } from '../../utils/supabase/info';

const FUNCTION_URL = `https://${projectId}.supabase.co/functions/v1/make-server-56370ef4`;

export class ApiError extends Error {
  status: number;
  data: any;
  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

function getAuthHeaders(sessionToken?: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${publicAnonKey}`,
  };
  if (sessionToken) {
    headers['X-Session-Token'] = sessionToken;
  }
  return headers;
}

async function handleResponse<T>(res: Response): Promise<T> {
  let data: any;
  try {
    const text = await res.text();
    data = text ? JSON.parse(text) : null;
  } catch (e) {
    if (!res.ok) {
      throw new ApiError(res.statusText || 'Request failed', res.status);
    }
    throw new ApiError('Invalid JSON response', res.status);
  }

  if (!res.ok) {
    const message = data?.error || data?.message || res.statusText || 'Request failed';
    throw new ApiError(message, res.status, data);
  }
  return data as T;
}

export const api = {
  async get<T>(path: string, sessionToken?: string | null): Promise<T> {
    const res = await fetch(`${FUNCTION_URL}${path}`, {
      method: 'GET',
      headers: getAuthHeaders(sessionToken),
    });
    return handleResponse<T>(res);
  },

  async post<T>(path: string, body?: any, sessionToken?: string | null): Promise<T> {
    const res = await fetch(`${FUNCTION_URL}${path}`, {
      method: 'POST',
      headers: getAuthHeaders(sessionToken),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return handleResponse<T>(res);
  },

  async put<T>(path: string, body?: any, sessionToken?: string | null): Promise<T> {
    const res = await fetch(`${FUNCTION_URL}${path}`, {
      method: 'PUT',
      headers: getAuthHeaders(sessionToken),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return handleResponse<T>(res);
  },

  async patch<T>(path: string, body?: any, sessionToken?: string | null): Promise<T> {
    const res = await fetch(`${FUNCTION_URL}${path}`, {
      method: 'PATCH',
      headers: getAuthHeaders(sessionToken),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return handleResponse<T>(res);
  },

  async delete<T>(path: string, sessionToken?: string | null): Promise<T> {
    const res = await fetch(`${FUNCTION_URL}${path}`, {
      method: 'DELETE',
      headers: getAuthHeaders(sessionToken),
    });
    return handleResponse<T>(res);
  },

  // Auth
  async register(data: any, sessionToken?: string | null) {
    return this.post<any>('/auth/register', data, sessionToken);
  },

  async login(data: any, sessionToken?: string | null) {
    return this.post<any>('/auth/login', data, sessionToken);
  },

  async logout(sessionToken?: string | null) {
    return this.post<any>('/auth/logout', {}, sessionToken);
  },

  async me(sessionToken?: string | null) {
    return this.get<any>('/auth/me', sessionToken);
  },

  // AI
  async chatAI(messages: Array<{role: string, content: string}>, language: 'en' | 'sw', sessionToken?: string | null) {
    return this.post<any>('/ai/chat', { messages, language }, sessionToken);
  },
};
