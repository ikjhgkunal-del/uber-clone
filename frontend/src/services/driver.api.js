import { api } from "./api";
const request = (path, method, body) =>
  api("/drivers" + path, {
    method,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
export const getDriverProfile = () => request("/me", "GET");
export const saveDriverProfile = (body) => request("/me", "PUT", body);
export const getVehicles = () => request("/me/vehicles", "GET");
export const saveVehicle = (body, id) =>
  request("/me/vehicles" + (id ? "/" + id : ""), id ? "PUT" : "POST", body);
export const removeVehicle = (id) => request("/me/vehicles/" + id, "DELETE");
export const activateVehicle = (id) =>
  request("/me/vehicles/" + id + "/activate", "POST");
export const getAvailability = () => request("/me/availability", "GET");
export const setDriverAvailability = (body) =>
  request("/me/availability", "PUT", body);
export const driverHeartbeat = () => request("/me/heartbeat", "POST");
export const updateDriverLocation = (body) =>
  request("/me/location", "PUT", body);
