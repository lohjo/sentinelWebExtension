import { FACTGUARD_API_BASE, FACTGUARD_LOGIN_PATH, FACTGUARD_CHAT_REPORT_PATH } from './config';
import type { StoredAuthUser } from './auth-storage';

const GENERIC_ERROR_MESSAGE = 'Something went wrong';

export type LoginSuccessResult = {
  success: true;
  user: StoredAuthUser;
  token: string;
};

export type LoginErrorResult = {
  success: false;
  error: string;
  details?: unknown;
};

export type LoginResult = LoginSuccessResult | LoginErrorResult;

type LoginResponseBody = {
  user?: { id?: string; email?: string; displayName?: string | null };
  token?: string;
  error?: string;
  details?: unknown;
};

function parseLoginSuccessBody(body: LoginResponseBody): LoginSuccessResult | null {
  const user = body.user;
  const token = body.token;
  if (!user || typeof token !== 'string' || !token) return null;
  if (typeof user.id !== 'string' || typeof user.email !== 'string') return null;
  return {
    success: true,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName ?? null,
    },
    token,
  };
}

export async function loginWithEmailAndPassword(
  email: string,
  password: string
): Promise<LoginResult> {
  const url = `${FACTGUARD_API_BASE}${FACTGUARD_LOGIN_PATH}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: email.trim(), password }),
    });
  } catch {
    return { success: false, error: GENERIC_ERROR_MESSAGE };
  }

  let body: LoginResponseBody;
  try {
    body = (await response.json()) as LoginResponseBody;
  } catch {
    return { success: false, error: GENERIC_ERROR_MESSAGE };
  }

  if (response.ok) {
    const success = parseLoginSuccessBody(body);
    if (success) return success;
    return { success: false, error: GENERIC_ERROR_MESSAGE };
  }

  const message = typeof body.error === 'string' ? body.error : GENERIC_ERROR_MESSAGE;

  if (response.status === 400) {
    return { success: false, error: message, details: body.details };
  }

  if (response.status === 401) {
    return { success: false, error: message };
  }

  return { success: false, error: GENERIC_ERROR_MESSAGE };
}

const MAX_SENDER_LENGTH = 200;
const MAX_TEXT_LENGTH = 10000;

export type ChatReportPayload = {
  headline: string;
  platform: string;
  messages: Array<{ sender: string; text: string; timestamp?: string }>;
  reportDescription: string;
  supportingEvidence?: string;
  conversationKey?: string;
};

export type ChatReportSuccessResult = { success: true };
export type ChatReportErrorResult = { success: false; error: string };
export type ChatReportResult = ChatReportSuccessResult | ChatReportErrorResult;

export async function submitChatReport(
  token: string,
  payload: ChatReportPayload
): Promise<ChatReportResult> {
  const messages = payload.messages.map((m) => ({
    sender: m.sender.slice(0, MAX_SENDER_LENGTH),
    text: m.text.slice(0, MAX_TEXT_LENGTH),
    ...(m.timestamp != null && m.timestamp !== '' && { timestamp: m.timestamp }),
  }));

  const url = `${FACTGUARD_API_BASE}${FACTGUARD_CHAT_REPORT_PATH}`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        headline: payload.headline,
        platform: payload.platform,
        messages,
        reportDescription: payload.reportDescription,
        ...(payload.supportingEvidence != null && payload.supportingEvidence !== '' && {
          supportingEvidence: payload.supportingEvidence,
        }),
        ...(payload.conversationKey != null && payload.conversationKey !== '' && {
          conversationKey: payload.conversationKey,
        }),
      }),
    });
  } catch {
    return { success: false, error: GENERIC_ERROR_MESSAGE };
  }

  if (response.status === 201) return { success: true };

  let body: { error?: string };
  try {
    body = (await response.json()) as { error?: string };
  } catch {
    return { success: false, error: GENERIC_ERROR_MESSAGE };
  }

  const message = typeof body.error === 'string' ? body.error : GENERIC_ERROR_MESSAGE;
  return { success: false, error: message };
}
