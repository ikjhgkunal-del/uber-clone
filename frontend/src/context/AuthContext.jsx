import { createContext, useContext, useState } from 'react';
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  return <AuthContext.Provider value={{ session, setSession, logout: () => setSession(null) }}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
