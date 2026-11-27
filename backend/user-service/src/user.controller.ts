import type { FastifyInstance } from "fastify";
import { requireIdentity } from "@uber-clone/shared/http";
import * as service from "./user.service.js";
import {
  profileBody,
  locationBody,
  locationParams,
  preferencesBody,
} from "./user.validation.js";
import type {
  ProfileUpdate,
  LocationInput,
  Preferences,
} from "./user.model.js";
export async function userRoutes(app: FastifyInstance) {
  const authorize = requireIdentity("customer");
  app.addHook("preHandler", async (request, reply) => {
    await authorize(request, reply);
    if (!reply.sent) await service.ensureProfile(request.principal);
  });
  app.get("/me", async (request) => ({
    profile: await service.getProfile(request.principal),
  }));
  app.put<{ Body: ProfileUpdate }>(
    "/me",
    { schema: { body: profileBody } },
    async (request) => ({
      profile: await service.updateProfile(request.principal.id, request.body),
    }),
  );
  app.get("/me/places", async (request) => ({
    places: await service.listPlaces(request.principal.id),
  }));
  app.post<{ Body: LocationInput }>(
    "/me/places",
    { schema: { body: locationBody } },
    async (request, reply) =>
      reply
        .code(201)
        .send({
          place: await service.savePlace(request.principal.id, request.body),
        }),
  );
  app.put<{ Params: { id: string }; Body: LocationInput }>(
    "/me/places/:id",
    { schema: { params: locationParams, body: locationBody } },
    async (request) => ({
      place: await service.savePlace(
        request.principal.id,
        request.body,
        request.params.id,
      ),
    }),
  );
  app.delete<{ Params: { id: string } }>(
    "/me/places/:id",
    { schema: { params: locationParams } },
    async (request) => {
      await service.deletePlace(request.principal.id, request.params.id);
      return { deleted: true };
    },
  );
  app.get("/me/preferences", async (request) => ({
    preferences: await service.getPreferences(request.principal.id),
  }));
  app.put<{ Body: Preferences }>(
    "/me/preferences",
    { schema: { body: preferencesBody } },
    async (request) => ({
      preferences: await service.updatePreferences(
        request.principal.id,
        request.body,
      ),
    }),
  );
}
