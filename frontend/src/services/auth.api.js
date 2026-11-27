import { api } from "./api";
const post = (path, body) =>
  api(
    "/auth" + path,
    { method: "POST", ...(body ? { body: JSON.stringify(body) } : {}) },
    false,
  );
export const signIn = (body) => post("/login", body);
export const signUp = (body) => post("/register", body);
export const signOut = () => post("/logout");
export const forgotPassword = (email) => post("/forgot-password", { email });
export const resetPassword = (body) => post("/reset-password", body);
export const verifyEmail = (token) => post("/verify-email", { token });
export const resendVerification = () =>
  api("/auth/resend-verification", { method: "POST" });
export const changePassword = (body) =>
  api("/auth/change-password", { method: "POST", body: JSON.stringify(body) });
