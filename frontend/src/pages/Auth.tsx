import { useId, useState, type FormEvent, type ReactNode } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Window } from "@/components/Window";
import { safeNext } from "@/components/RequireAuth";
import { api, errorMessage, type User } from "@/lib/api";
import { useAuth } from "@/lib/auth";

function AuthShell({ title, heading, lede, children, foot }: { title: string; heading: ReactNode; lede: string; children: ReactNode; foot?: ReactNode }) {
  return (
    <main className="auth sky" id="main">
      <span className="bubble" style={{ width: 220, height: 220, left: "6%", top: "14%" }} aria-hidden="true" />
      <span className="bubble" style={{ width: 120, height: 120, right: "10%", top: "58%", animationDelay: "-3s" }} aria-hidden="true" />
      <span className="bubble" style={{ width: 64, height: 64, right: "24%", top: "16%", animationDelay: "-6s" }} aria-hidden="true" />
      <Window title={title} className="auth__window" bodyClassName="auth__body" status={foot}>
        <div className="auth__head">
          <h1 className="auth__title">{heading}</h1>
          <p className="auth__lede">{lede}</p>
        </div>
        {children}
      </Window>
    </main>
  );
}

function PasswordField({ label, value, onChange, autoComplete, invalid }: { label: string; value: string; onChange: (v: string) => void; autoComplete: string; invalid?: boolean }) {
  const [shown, setShown] = useState(false);
  const id = useId();
  // The label sits outside the wrapper so the Show button never becomes part of the input's name.
  return (
    <div className="field">
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <span className="input-with-action">
        <input
          id={id}
          className="input"
          type={shown ? "text" : "password"}
          required
          minLength={autoComplete === "new-password" ? 8 : undefined}
          autoComplete={autoComplete}
          value={value}
          aria-invalid={invalid || undefined}
          onChange={(e) => onChange(e.target.value)}
        />
        <button type="button" onClick={() => setShown((s) => !s)} aria-label={shown ? "Hide password" : "Show password"}>
          {shown ? "Hide" : "Show"}
        </button>
      </span>
    </div>
  );
}

function Submit({ busy, label, busyLabel }: { busy: boolean; label: string; busyLabel: string }) {
  return (
    <button type="submit" className="btn btn--lg btn--block" disabled={busy}>
      {busy ? <LoaderCircle size={18} className="spin" aria-hidden="true" /> : null}
      {busy ? busyLabel : label}
    </button>
  );
}

export function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={next} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const u = await login(email, password);
      toast.success(`Welcome back, ${u.name}`);
      navigate(next, { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="sign_in.exe"
      heading="Welcome back."
      lede="Sign in to pick up your edits where you left them."
      foot={
        <span>
          New here? <Link to={`/register${params.get("next") ? `?next=${encodeURIComponent(next)}` : ""}`}>Make an account</Link>
        </span>
      }
    >
      <form className="auth__form" onSubmit={submit} noValidate={false}>
        <label className="field">
          <span className="label">Email</span>
          <input className="input" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!error || undefined} />
        </label>
        <PasswordField label="Password" value={password} onChange={setPassword} autoComplete="current-password" invalid={!!error} />
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
        <Submit busy={busy} label="Sign in" busyLabel="Signing in…" />
        <Link to="/forgot-password" className="auth__aside">
          Forgot your password?
        </Link>
      </form>
    </AuthShell>
  );
}

export function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get("next"));
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={next} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Use at least 8 characters for your password.");
      return;
    }
    setBusy(true);
    try {
      await register(email, password, name.trim());
      toast.success("Account made. Time to get edited.");
      navigate(next, { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="new_account.exe"
      heading="Make an account."
      lede="Free. Your edits save to your own gallery, ready to re-edit or share."
      foot={
        <span>
          Already have one? <Link to={`/login${params.get("next") ? `?next=${encodeURIComponent(next)}` : ""}`}>Sign in</Link>
        </span>
      }
    >
      <form className="auth__form" onSubmit={submit}>
        <label className="field">
          <span className="label">
            Name <span className="label__optional">(optional)</span>
          </span>
          <input className="input" autoComplete="nickname" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="field">
          <span className="label">Email</span>
          <input className="input" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <PasswordField label="Password" value={password} onChange={setPassword} autoComplete="new-password" invalid={!!error && password.length < 8} />
        <p className="hint">At least 8 characters.</p>
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
        <Submit busy={busy} label="Create account" busyLabel="Creating…" />
      </form>
    </AuthShell>
  );
}

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setSent(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="forgot.exe"
      heading="Forgot it? Happens."
      lede="Enter your email and we'll send a link to choose a new password."
      foot={
        <span>
          Remembered it? <Link to="/login">Sign in</Link>
        </span>
      }
    >
      {sent ? (
        <div className="auth__done" role="status">
          <p>
            If <strong>{email}</strong> has an account, a reset link is on its way. It works once and expires in an hour.
          </p>
          <p className="hint">Running locally without email set up? The link is printed in the backend terminal.</p>
        </div>
      ) : (
        <form className="auth__form" onSubmit={submit}>
          <label className="field">
            <span className="label">Email</span>
            <input className="input" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
          <Submit busy={busy} label="Send reset link" busyLabel="Sending…" />
        </form>
      )}
    </AuthShell>
  );
}

export function ResetPassword() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) return setError("Use at least 8 characters.");
    if (password !== confirm) return setError("Those passwords don't match.");
    setBusy(true);
    try {
      const u = await api.post<User>("/auth/reset-password", { token, password });
      setUser(u);
      toast.success("Password changed. You're signed in.");
      navigate("/editor", { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (!token) {
    return (
      <AuthShell title="reset.exe" heading="That link is incomplete." lede="Open the link from your email again, or ask for a new one.">
        <Link to="/forgot-password" className="btn btn--lg btn--block">
          Get a new link
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="reset.exe" heading="Choose a new password." lede="This signs you out everywhere else.">
      <form className="auth__form" onSubmit={submit}>
        <PasswordField label="New password" value={password} onChange={setPassword} autoComplete="new-password" />
        <PasswordField label="Type it again" value={confirm} onChange={setConfirm} autoComplete="new-password" invalid={!!error && password !== confirm} />
        {error ? (
          <p className="form-error" role="alert">
            {error}{" "}
            {error.includes("expired") || error.includes("invalid") ? <Link to="/forgot-password">Get a new link</Link> : null}
          </p>
        ) : null}
        <Submit busy={busy} label="Save password" busyLabel="Saving…" />
      </form>
    </AuthShell>
  );
}
