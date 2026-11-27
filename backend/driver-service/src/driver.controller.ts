import type { FastifyInstance } from "fastify";
import { requireIdentity } from "@uber-clone/shared/http";
import * as service from "./driver.service.js";
import * as schema from "./driver.validation.js";
import type {
  ProfileInput,
  VehicleInput,
  Coordinates,
} from "./driver.model.js";
export async function driverRoutes(app: FastifyInstance) {
  const authorize = requireIdentity("driver");
  app.addHook("preHandler", async (r, p) => {
    await authorize(r, p);
    if (!p.sent) await service.ensureProfile(r.principal);
  });
  app.get("/me", async (r) => ({
    profile: await service.getProfile(r.principal),
  }));
  app.put<{ Body: ProfileInput }>(
    "/me",
    { schema: { body: schema.profileBody } },
    async (r) => ({
      profile: await service.updateProfile(r.principal.id, r.body),
    }),
  );
  app.get("/me/vehicles", async (r) => ({
    vehicles: await service.listVehicles(r.principal.id),
  }));
  app.post<{ Body: VehicleInput }>(
    "/me/vehicles",
    { schema: { body: schema.vehicleBody } },
    async (r, p) =>
      p
        .code(201)
        .send({ vehicle: await service.saveVehicle(r.principal.id, r.body) }),
  );
  app.put<{ Params: { id: string }; Body: VehicleInput }>(
    "/me/vehicles/:id",
    { schema: { params: schema.idParams, body: schema.vehicleEditBody } },
    async (r) => ({
      vehicle: await service.saveVehicle(r.principal.id, r.body, r.params.id),
    }),
  );
  app.delete<{ Params: { id: string } }>(
    "/me/vehicles/:id",
    { schema: { params: schema.idParams } },
    async (r) => {
      await service.deleteVehicle(r.principal.id, r.params.id);
      return { deleted: true };
    },
  );
  app.post<{ Params: { id: string } }>(
    "/me/vehicles/:id/activate",
    { schema: { params: schema.idParams } },
    async (r) => ({
      vehicle: await service.activateVehicle(r.principal.id, r.params.id),
    }),
  );
  app.get("/me/availability", async (r) => ({
    availability: await service.availability(r.principal),
  }));
  app.put<{ Body: { online: boolean } & Partial<Coordinates> }>(
    "/me/availability",
    { schema: { body: schema.availabilityBody } },
    async (r) => ({
      availability: await service.changeAvailability(
        r.principal,
        r.body.online,
        r.body as Coordinates,
      ),
    }),
  );
  app.post("/me/heartbeat", async (r) => ({
    availability: await service.heartbeat(r.principal),
  }));
  app.put<{ Body: Coordinates }>(
    "/me/location",
    { schema: { body: schema.coordinates } },
    async (r) => ({
      availability: await service.heartbeat(r.principal, r.body),
    }),
  );
}
