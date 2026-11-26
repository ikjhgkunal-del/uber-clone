import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Role } from './auth.model.js';
declare module '@fastify/jwt' { interface FastifyJWT { payload: { sub: string; role: Role }; user: { sub: string; role: Role } } }
export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try { await request.jwtVerify(); } catch { return reply.code(401).send({ message: 'Authentication required' }); }
}
export function requireRole(role: Role) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await authenticate(request, reply);
    if (reply.sent) return;
    if (request.user.role !== role) return reply.code(403).send({ message: 'Permission denied' });
  };
}
