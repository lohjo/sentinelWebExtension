export type StoredAuthUser = {
  id: string;
  email: string;
  displayName: string | null;
};

export type StoredAuth = {
  token: string;
  user: StoredAuthUser;
};

const AUTH_STORAGE_KEY = 'hackomania-auth';

export async function getStoredAuth(): Promise<StoredAuth | null> {
  const stored = (await browser.storage.local.get(AUTH_STORAGE_KEY)) as {
    [AUTH_STORAGE_KEY]?: unknown;
  };
  const raw = stored[AUTH_STORAGE_KEY];
  if (!raw || typeof raw !== 'object') return null;

  const record = raw as Record<string, unknown>;
  const token = record.token;
  const user = record.user;

  if (typeof token !== 'string' || !token) return null;
  if (!user || typeof user !== 'object') return null;

  const u = user as Record<string, unknown>;
  if (typeof u.id !== 'string' || typeof u.email !== 'string') return null;

  return {
    token,
    user: {
      id: u.id as string,
      email: u.email as string,
      displayName: u.displayName == null ? null : String(u.displayName),
    },
  };
}

export async function setStoredAuth(auth: StoredAuth): Promise<void> {
  await browser.storage.local.set({
    [AUTH_STORAGE_KEY]: {
      token: auth.token,
      user: auth.user,
    },
  });
}

export async function clearStoredAuth(): Promise<void> {
  await browser.storage.local.remove(AUTH_STORAGE_KEY);
}
