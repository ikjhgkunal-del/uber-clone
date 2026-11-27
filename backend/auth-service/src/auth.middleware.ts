import type { FastifyReply, FastifyRequest } from "fastify";
import { pool, type Role } from "./auth.model.js";
declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { sub: string; role: Role; sid: string };
    user: { sub: string; role: Role; sid: string };
  }
}
export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    await request.jwtVerify();
  } catch {
    return reply
      .code(401)
      .send({ message: "Your session has expired. Please sign in again." });
  }
  const result = await pool.query(
    `SELECT u.role FROM auth.sessions s JOIN auth.users u ON u.id=s.user_id WHERE s.id=$1 AND s.user_id=$2 AND s.revoked_at IS NULL AND s.expires_at>now() AND u.status='active'`,
    [request.user.sid, request.user.sub],
  );
  if (!result.rows[0])
    return reply.code(401).send({ message: "Please sign in again." });
  request.user.role = result.rows[0].role;
}
export function requireRole(role: Role) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await authenticate(request, reply);
    if (!reply.sent && request.user.role !== role)
      return reply
        .code(403)
        .send({ message: "You do not have access to this page." });
  };
}
