const email = { type: "string", format: "email", maxLength: 254 } as const;
const password = { type: "string", minLength: 12, maxLength: 128 } as const;
export const credentials = {
  type: "object",
  additionalProperties: false,
  required: ["email", "password"],
  properties: {
    email,
    password: { type: "string", minLength: 1, maxLength: 128 },
    remember: { type: "boolean" },
  },
} as const;
export const registration = {
  type: "object",
  additionalProperties: false,
  required: ["email", "password", "role", "name"],
  properties: {
    email,
    password,
    name: { type: "string", minLength: 1, maxLength: 100, pattern: "[^\\s]" },
    role: { type: "string", enum: ["customer", "driver"] },
  },
} as const;
export const emailBody = {
  type: "object",
  additionalProperties: false,
  required: ["email"],
  properties: { email },
} as const;
export const tokenBody = {
  type: "object",
  additionalProperties: false,
  required: ["token"],
  properties: { token: { type: "string", pattern: "^[a-f0-9]{64}$" } },
} as const;
export const resetBody = {
  ...tokenBody,
  required: ["token", "password"],
  properties: { ...tokenBody.properties, password },
} as const;
export const changeBody = {
  type: "object",
  additionalProperties: false,
  required: ["currentPassword", "password"],
  properties: {
    currentPassword: { type: "string", minLength: 1, maxLength: 128 },
    password,
  },
} as const;
