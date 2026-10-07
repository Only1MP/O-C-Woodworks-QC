import { QCDefectLog, ProductionLineState } from '../types';

export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  role: 'admin' | 'inspector' | 'lead';
}

export interface PublicUser {
  id: string;
  username: string;
  displayName: string;
  role: 'admin' | 'inspector' | 'lead';
  createdAt: string;
}

// In-memory or localStorage token cache for cross-platform support
const TOKEN_STORAGE_KEY = 'qc_bearer_token';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // ignore
  }
}

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});
  
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Include credentials for cookie session support
  const res = await fetch(`/api${endpoint}`, {
    ...options,
    headers,
    credentials: 'include'
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Server request failed (${res.status})`);
  }
  return data as T;
}

export const qcApi = {
  // Auth
  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const data = await apiRequest<{ authenticated: boolean; user: AuthUser | null }>('/auth/me');
      return data.user || null;
    } catch {
      return null;
    }
  },

  async getPublicUsers(): Promise<PublicUser[]> {
    const data = await apiRequest<{ users: PublicUser[] }>('/auth/users');
    return data.users || [];
  },

  async login(username: string, pin: string): Promise<AuthUser> {
    const data = await apiRequest<{ success: boolean; token: string; user: AuthUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, pin })
    });
    setStoredToken(data.token);
    return data.user;
  },

  async logout(): Promise<void> {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } finally {
      setStoredToken(null);
    }
  },

  async createUser(payload: { username: string; displayName: string; pin: string; role: string }): Promise<PublicUser> {
    const data = await apiRequest<{ success: boolean; user: PublicUser }>('/auth/create-user', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return data.user;
  },

  async changePin(newPin: string, targetUserId?: string): Promise<void> {
    await apiRequest('/auth/change-pin', {
      method: 'POST',
      body: JSON.stringify({ newPin, targetUserId })
    });
  },

  // Logs
  async getLogs(): Promise<QCDefectLog[]> {
    const data = await apiRequest<{ logs: QCDefectLog[] }>('/logs');
    return data.logs || [];
  },

  async saveLog(log: QCDefectLog): Promise<QCDefectLog> {
    const data = await apiRequest<{ success: boolean; log: QCDefectLog }>('/logs', {
      method: 'POST',
      body: JSON.stringify(log)
    });
    return data.log;
  },

  async deleteLog(id: string): Promise<void> {
    await apiRequest(`/logs/${id}`, { method: 'DELETE' });
  },

  async bulkImportLogs(logs: QCDefectLog[]): Promise<{ imported: number; total: number }> {
    return apiRequest('/logs/bulk-import', {
      method: 'POST',
      body: JSON.stringify({ logs })
    });
  },

  // Staff
  async getStaff(): Promise<ProductionLineState> {
    const data = await apiRequest<{ staff: ProductionLineState }>('/staff');
    return data.staff;
  },

  async saveStaff(staff: ProductionLineState): Promise<ProductionLineState> {
    const data = await apiRequest<{ success: boolean; staff: ProductionLineState }>('/staff', {
      method: 'POST',
      body: JSON.stringify({ staff })
    });
    return data.staff;
  }
};
