let accessToken = null;
let refreshPromise = null;
let onSession = () => {};
export function configureSession(listener) {
  onSession = listener;
}
export function storeSession(session) {
  accessToken = session?.token ?? null;
  onSession(session);
}
export async function api(path, options = {}, retry = true) {
  let response;
  try {
    response = await fetch("/api" + path, {
      ...options,
      credentials: "same-origin",
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        "X-Requested-With": "uber-clone",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new Error("Unable to connect. Check your connection and try again.");
  }
  if (
    response.status === 401 &&
    retry &&
    !["/auth/login", "/auth/register", "/auth/refresh"].includes(path)
  ) {
    await refreshSession();
    return api(path, options, false);
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(
      data.message ||
        (response.status === 429
          ? "Too many attempts. Try again later."
          : "Something went wrong. Please try again."),
    );
    error.status = response.status;
    throw error;
  }
  return data;
}
export function refreshSession() {
  if (!refreshPromise)
    refreshPromise = api("/auth/refresh", { method: "POST" }, false)
      .then((session) => {
        storeSession(session);
        return session;
      })
      .catch((error) => {
        storeSession(null);
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  return refreshPromise;
}
