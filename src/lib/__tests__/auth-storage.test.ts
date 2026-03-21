import { beforeEach, describe, it, expect, vi } from 'vitest';
import type { StoredAuth } from '../auth-storage';

const AUTH_STORAGE_KEY = 'hackomania-auth';

let storage: Record<string, unknown> = {};

const browser = {
  storage: {
    local: {
      get: vi.fn(async (keys: string | string[] | null) => {
        if (keys === null || (Array.isArray(keys) && keys.length === 0)) {
          return { ...storage };
        }
        const k = typeof keys === 'string' ? keys : keys[0];
        return k ? { [k]: storage[k] } : {};
      }),
      set: vi.fn(async (items: Record<string, unknown>) => {
        Object.assign(storage, items);
      }),
      remove: vi.fn(async (keys: string | string[]) => {
        const arr = typeof keys === 'string' ? [keys] : keys;
        arr.forEach((k) => delete storage[k]);
      }),
    },
  },
};

vi.stubGlobal('browser', browser);

const { getStoredAuth, setStoredAuth, clearStoredAuth } = await import(
  '../auth-storage'
);

describe('auth-storage', () => {
  beforeEach(() => {
    storage = {};
    vi.mocked(browser.storage.local.get).mockClear();
    vi.mocked(browser.storage.local.set).mockClear();
    vi.mocked(browser.storage.local.remove).mockClear();
  });

  it('returns null when no auth is stored', async () => {
    const result = await getStoredAuth();
    expect(result).toBeNull();
  });

  it('returns null when stored value is not an object', async () => {
    storage[AUTH_STORAGE_KEY] = 'not-an-object';
    const result = await getStoredAuth();
    expect(result).toBeNull();
  });

  it('returns null when token is missing', async () => {
    storage[AUTH_STORAGE_KEY] = { user: { id: 'id-1', email: 'test@example.com' } };
    const result = await getStoredAuth();
    expect(result).toBeNull();
  });

  it('returns null when user is missing', async () => {
    storage[AUTH_STORAGE_KEY] = { token: 'jwt-token' };
    const result = await getStoredAuth();
    expect(result).toBeNull();
  });

  it('returns auth when valid data is stored', async () => {
    const auth: StoredAuth = {
      token: 'jwt-token',
      user: { id: 'user-1', email: 'test@example.com', displayName: 'Test User' },
    };
    storage[AUTH_STORAGE_KEY] = auth;
    const result = await getStoredAuth();
    expect(result).toEqual(auth);
  });

  it('returns auth with null displayName when user has null displayName', async () => {
    storage[AUTH_STORAGE_KEY] = {
      token: 'jwt',
      user: { id: 'u1', email: 'user@example.com', displayName: null },
    };
    const result = await getStoredAuth();
    expect(result).toEqual({
      token: 'jwt',
      user: { id: 'u1', email: 'user@example.com', displayName: null },
    });
  });

  it('persists auth so getStoredAuth returns it after setStoredAuth', async () => {
    const auth: StoredAuth = {
      token: 'secret-jwt',
      user: { id: 'id-1', email: 'test@example.com', displayName: null },
    };
    await setStoredAuth(auth);
    expect(browser.storage.local.set).toHaveBeenCalledWith({
      [AUTH_STORAGE_KEY]: auth,
    });
    const result = await getStoredAuth();
    expect(result).toEqual(auth);
  });

  it('clears auth when clearStoredAuth is called', async () => {
    storage[AUTH_STORAGE_KEY] = {
      token: 'jwt',
      user: { id: '1', email: 'a@example.com', displayName: null },
    };
    await clearStoredAuth();
    expect(browser.storage.local.remove).toHaveBeenCalledWith(AUTH_STORAGE_KEY);
    storage = {};
    const result = await getStoredAuth();
    expect(result).toBeNull();
  });
});
