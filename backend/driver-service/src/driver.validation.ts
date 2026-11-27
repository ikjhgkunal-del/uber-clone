const text = (maxLength: number) => ({
  type: "string",
  minLength: 1,
  maxLength,
  pattern: "\\S",
});
const version = { type: "integer", minimum: 1 };
export const profileBody = {
  type: "object",
  additionalProperties: false,
  required: ["name", "phone", "licenseNumber", "licenseExpires", "version"],
  properties: {
    name: text(80),
    phone: { type: "string", pattern: "^(|\\+[1-9][0-9]{7,14})$" },
    licenseNumber: { type: "string", pattern: "^(|[A-Za-z0-9 -]{5,32})$" },
    licenseExpires: {
      anyOf: [
        { type: "string", pattern: "^[0-9]{4}-[0-9]{2}-[0-9]{2}$" },
        { type: "null" },
      ],
    },
    version,
  },
};
const vehicleProperties = {
  make: text(40),
  model: text(40),
  color: text(30),
  plate: { type: "string", pattern: "^[A-Za-z0-9 -]{3,16}$" },
  year: {
    type: "integer",
    minimum: 1990,
    maximum: new Date().getUTCFullYear() + 1,
  },
  seats: { type: "integer", minimum: 1, maximum: 8 },
};
export const vehicleBody = {
  type: "object",
  additionalProperties: false,
  required: Object.keys(vehicleProperties),
  properties: vehicleProperties,
};
export const vehicleEditBody = {
  ...vehicleBody,
  required: [...vehicleBody.required, "version"],
  properties: { ...vehicleProperties, version },
};
export const idParams = {
  type: "object",
  additionalProperties: false,
  required: ["id"],
  properties: { id: { type: "string", format: "uuid" } },
};
export const coordinates = {
  type: "object",
  additionalProperties: false,
  required: ["latitude", "longitude"],
  properties: {
    latitude: { type: "number", minimum: -90, maximum: 90 },
    longitude: { type: "number", minimum: -180, maximum: 180 },
  },
};
export const availabilityBody = {
  oneOf: [
    {
      type: "object",
      additionalProperties: false,
      required: ["online"],
      properties: { online: { const: false } },
    },
    {
      type: "object",
      additionalProperties: false,
      required: ["online", "latitude", "longitude"],
      properties: { online: { const: true }, ...coordinates.properties },
    },
  ],
};
