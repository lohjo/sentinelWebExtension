import { beforeEach, describe, it, expect, vi } from 'vitest';
import { loginWithEmailAndPassword } from '../hackomania-api';

vi.mock('../config', () => ({
  FACTGUARD_API_BASE: 'http://localhost:3000',
  FACTGUARD_LOGIN_PATH: '/api/auth/login',
}));

describe('hackomania-api loginWithEmailAndPassword', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.mocked(fetch).mockReset();
  });

  it('returns success with user and token when server responds 200 with valid body', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        user: { id: 'user-1', email: 'test@example.com', displayName: 'Test' },
        token: 'jwt-token-here',
      }),
    } as Response);

    const result = await loginWithEmailAndPassword('test@example.com', 'password123');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.user.email).toBe('test@example.com');
      expect(result.user.id).toBe('user-1');
      expect(result.user.displayName).toBe('Test');
      expect(result.token).toBe('jwt-token-here');
    }
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/auth/login',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
      })
    );
  });

  it('trims email before sending', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        user: { id: 'u', email: 'user@example.com', displayName: null },
        token: 't',
      }),
    } as Response);

    await loginWithEmailAndPassword('  user@example.com  ', 'password123');

    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({ email: 'user@example.com', password: 'password123' }),
      })
    );
  });

  it('returns error with server message when server responds 401', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Invalid email or password' }),
    } as Response);

    const result = await loginWithEmailAndPassword('test@example.com', 'wrong');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Invalid email or password');
    }
  });

  it('returns error with message when server responds 400', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Validation failed', details: [] }),
    } as Response);

    const result = await loginWithEmailAndPassword('not-an-email', 'password123');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Validation failed');
      expect(result.details).toEqual([]);
    }
  });

  it('returns generic error when server responds 500', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Internal server error' }),
    } as Response);

    const result = await loginWithEmailAndPassword('test@example.com', 'password123');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Something went wrong');
    }
  });

  it('returns generic error when fetch throws', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

    const result = await loginWithEmailAndPassword('test@example.com', 'password123');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Something went wrong');
    }
  });

  it('returns generic error when response body is invalid JSON', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => {
        throw new Error('Invalid JSON');
      },
    } as Response);

    const result = await loginWithEmailAndPassword('test@example.com', 'password123');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Something went wrong');
    }
  });

  it('returns generic error when 200 response has missing user or token', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ user: { id: '1', email: 'a@b.com' } }),
    } as Response);

    const result = await loginWithEmailAndPassword('test@example.com', 'password123');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Something went wrong');
    }
  });
});
