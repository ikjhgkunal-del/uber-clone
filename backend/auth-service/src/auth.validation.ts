export const credentials = {
  type: 'object', additionalProperties: false, required: ['email', 'password'],
  properties: { email: { type: 'string', format: 'email', maxLength: 254 }, password: { type: 'string', minLength: 12, maxLength: 128 } }
} as const;
export const registration = { ...credentials, required: ['email', 'password', 'role'], properties: { ...credentials.properties, role: { type: 'string', enum: ['customer', 'driver'] } } } as const;
