import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { signIn, signUp } from './services/auth.api';
function AccountScreen() {
  const { session, setSession, logout } = useAuth();
  const [mode, setMode] = useState('login');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try { setSession(await (mode === 'login' ? signIn(values) : signUp(values))); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  return <main><p className="brand">UBER CLONE</p>{session ? <><h1>Welcome, {session.user.role === 'customer' ? 'passenger' : 'driver'}.</h1><p>{session.user.email}</p><p>Your account is ready. Ride features are coming next.</p><button onClick={logout}>Sign out</button></> : <><h1>{mode === 'login' ? 'Welcome back.' : 'Start your journey.'}</h1><form onSubmit={submit}><label>Email<input name="email" type="email" autoComplete="email" required /></label><label>Password<input name="password" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={12} maxLength={128} required /></label>{mode === 'register' && <><small>Use at least 12 characters.</small><label>Account type<select name="role"><option value="customer">Passenger</option><option value="driver">Driver</option></select></label></>}{error && <p role="alert">{error}</p>}<button disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}</button></form><button className="secondary" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>{mode === 'login' ? 'Create an account' : 'Already registered? Sign in'}</button></>}</main>;
}
export default function App() { return <AuthProvider><AccountScreen /></AuthProvider>; }
