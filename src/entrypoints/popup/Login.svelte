<script lang="ts">
  import { loginWithEmailAndPassword } from '../../lib/hackomania-api';
  import { setStoredAuth } from '../../lib/auth-storage';
  import type { StoredAuthUser } from '../../lib/auth-storage';
  import { FACTGUARD_API_BASE } from '../../lib/config';

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const MIN_PASSWORD_LENGTH = 1;
  const REGISTER_URL = `${FACTGUARD_API_BASE}/auth/register`;

  export let onLoginSuccess: (user: StoredAuthUser) => void = () => {};

  let email = '';
  let password = '';
  let formError = '';
  let isSubmitting = false;

  function getEmailError(): string {
    const trimmed = email.trim();
    if (!trimmed) return 'Email is required';
    if (!EMAIL_REGEX.test(trimmed)) return 'Invalid email address';
    return '';
  }

  function getPasswordError(): string {
    if (password.length < MIN_PASSWORD_LENGTH) return 'Password is required';
    return '';
  }

  function hasValidationErrors(): boolean {
    return !!getEmailError() || !!getPasswordError();
  }

  async function handleSubmit(event: Event) {
    event.preventDefault();
    formError = '';

    if (hasValidationErrors()) {
      formError = getEmailError() || getPasswordError();
      return;
    }

    isSubmitting = true;
    const result = await loginWithEmailAndPassword(email.trim(), password);

    if (result.success) {
      await setStoredAuth({ token: result.token, user: result.user });
      onLoginSuccess(result.user);
      return;
    }

    formError = result.error;
    isSubmitting = false;
  }
</script>

<main class="login-shell">
  <section class="login-card">
    <h1 class="login-title">Log in to FactGuard</h1>
    <p class="login-subtitle">Sign in with your account to use the extension.</p>

    <form class="login-form" onsubmit={handleSubmit}>
      <label class="login-label" for="login-email">Email</label>
      <input
        id="login-email"
        class="login-input"
        type="email"
        autocomplete="email"
        placeholder="you@example.com"
        bind:value={email}
        disabled={isSubmitting}
        aria-invalid={!!getEmailError()}
        aria-describedby={formError ? 'login-error' : undefined}
      />

      <label class="login-label" for="login-password">Password</label>
      <input
        id="login-password"
        class="login-input"
        type="password"
        autocomplete="current-password"
        placeholder="••••••••"
        bind:value={password}
        disabled={isSubmitting}
        aria-invalid={!!getPasswordError()}
      />

      {#if formError}
        <p id="login-error" class="login-error" role="alert">{formError}</p>
      {/if}

      <button
        type="submit"
        class="login-submit"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Signing in…' : 'Sign in'}
      </button>
    </form>

    <p class="login-register">
      New user? <a class="login-register-link" href={REGISTER_URL} target="_blank" rel="noopener noreferrer">Register an account</a>
    </p>
  </section>
</main>

<style>
  .login-shell {
    box-sizing: border-box;
    width: 100%;
    min-height: 640px;
    padding: 24px 22px;
    background: #f7f5f2;
  }

  .login-card {
    background: #ffffff;
    border: 1px solid rgba(79, 72, 61, 0.12);
    border-radius: 12px;
    padding: 28px 24px;
    box-shadow: 0 2px 0 rgba(255, 255, 255, 0.35) inset;
  }

  .login-title {
    margin: 0 0 8px;
    font-size: 22px;
    font-weight: 700;
    color: #3c3d5e;
  }

  .login-subtitle {
    margin: 0 0 24px;
    font-size: 14px;
    color: #61584b;
  }

  .login-form {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .login-label {
    font-size: 13px;
    font-weight: 600;
    color: #333333;
    display: block;
  }

  .login-input {
    width: 100%;
    padding: 10px 16px;
    font-size: 16px;
    border: 1px solid #cccccc;
    border-radius: 8px;
    box-sizing: border-box;
  }

  .login-input:focus {
    outline: 2px solid #a6b5f9;
    outline-offset: 2px;
  }

  .login-input[aria-invalid='true'] {
    border-color: #b91c1c;
  }

  .login-input:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .login-error {
    margin: 0;
    font-size: 14px;
    color: #b91c1c;
    font-weight: 500;
  }

  .login-submit {
    width: 100%;
    margin-top: 8px;
    padding: 12px 24px;
    font-size: 16px;
    font-weight: 600;
    color: white;
    background-color: #3c5ae1;
    border: none;
    border-radius: 30px;
    cursor: pointer;
  }

  .login-submit:hover:not(:disabled) {
    background-color: #1c40dd;
  }

  .login-submit:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .login-register {
    margin: 20px 0 0;
    font-size: 14px;
    color: #61584b;
    text-align: center;
  }

  .login-register-link {
    color: #3c5ae1;
    font-weight: 600;
    text-decoration: none;
  }

  .login-register-link:hover {
    text-decoration: underline;
  }
</style>
