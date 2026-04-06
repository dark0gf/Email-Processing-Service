import { FormEvent, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";

import { loginWithCredentials, parseSessionToken, readAccessToken, saveAuthTokens } from "../auth";

interface LoginFormState {
  username: string;
  password: string;
}

const initialLoginState: LoginFormState = {
  username: "",
  password: "",
};

export function LoginPage() {
  const [loginForm, setLoginForm] = useState<LoginFormState>(initialLoginState);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const session = parseSessionToken(readAccessToken());

  if (session) {
    return <Navigate to="/" replace />;
  }

  async function handleLoginSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setIsSubmitting(true);
    setLoginError(null);

    try {
      const tokens = await loginWithCredentials(loginForm.username, loginForm.password);
      saveAuthTokens(tokens);
      setLoginForm(initialLoginState);
      navigate("/", { replace: true });
    } catch {
      setLoginError("Invalid username or password.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center p-4 sm:p-6">
      <section className="w-full max-w-xl rounded-3xl border border-slate-200/80 bg-white/80 p-8 shadow-xl backdrop-blur sm:p-9">
        <h1 className="mb-3 text-balance font-['Fraunces','Georgia',serif] text-4xl leading-[0.95] sm:text-5xl">Email processing dashboard</h1>
        <form className="mt-7 grid gap-3.5" onSubmit={handleLoginSubmit}>
          <label className="grid gap-2 font-semibold text-slate-800">
            Username
            <input
              autoComplete="username"
              className="min-h-11 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400"
              name="username"
              onChange={(event) => setLoginForm((current) => ({ ...current, username: event.target.value }))}
              placeholder="admin"
              type="text"
              value={loginForm.username}
            />
          </label>
          <label className="grid gap-2 font-semibold text-slate-800">
            Password
            <input
              autoComplete="current-password"
              className="min-h-11 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400"
              name="password"
              onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))}
              placeholder="demo123"
              type="password"
              value={loginForm.password}
            />
          </label>
          {loginError ? <p className="text-sm text-rose-700">{loginError}</p> : null}
          <button
            className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Signing in..." : "Open dashboard"}
          </button>
        </form>
      </section>
    </main>
  );
}
