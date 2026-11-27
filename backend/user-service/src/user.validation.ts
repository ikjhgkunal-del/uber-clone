const name = {
  type: "string",
  minLength: 1,
  maxLength: 100,
  pattern: "\\S",
} as const;
export const profileBody = {
  type: "object",
  additionalProperties: false,
  required: ["name", "phone", "version"],
  properties: {
    name,
    phone: { type: "string", pattern: "^$|^\\+[1-9][0-9]{7,14}$" },
    version: { type: "integer", minimum: 1 },
  },
} as const;
export const locationBody = {
  type: "object",
  additionalProperties: false,
  required: ["kind", "label", "address", "latitude", "longitude"],
  properties: {
    kind: { type: "string", enum: ["home", "work", "other"] },
    label: { ...name, maxLength: 60 },
    address: { ...name, minLength: 3, maxLength: 300 },
    latitude: { type: "number", minimum: -90, maximum: 90 },
    longitude: { type: "number", minimum: -180, maximum: 180 },
  },
} as const;
export const locationParams = {
  type: "object",
  additionalProperties: false,
  required: ["id"],
  properties: { id: { type: "string", format: "uuid" } },
} as const;
export const preferencesBody = {
  type: "object",
  additionalProperties: false,
  required: ["quietRide", "coolTemperature", "assistanceNeeded", "version"],
  properties: {
    quietRide: { type: "boolean" },
    coolTemperature: { type: "boolean" },
    assistanceNeeded: { type: "boolean" },
    version: { type: "integer", minimum: 1 },
  },
} as const;
