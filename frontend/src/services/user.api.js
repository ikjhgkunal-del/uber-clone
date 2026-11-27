import { api } from "./api";
const json = (method, body) => ({ method, body: JSON.stringify(body) });
export const getProfile = () => api("/users/me");
export const saveProfile = (body) => api("/users/me", json("PUT", body));
export const getPlaces = () => api("/users/me/places");
export const createPlace = (body) =>
  api("/users/me/places", json("POST", body));
export const updatePlace = (id, body) =>
  api("/users/me/places/" + id, json("PUT", body));
export const deletePlace = (id) =>
  api("/users/me/places/" + id, { method: "DELETE" });
export const getPreferences = () => api("/users/me/preferences");
export const savePreferences = (body) =>
  api("/users/me/preferences", json("PUT", body));
