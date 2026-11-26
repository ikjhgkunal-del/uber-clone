import type { FastifyInstance } from 'fastify';
import { login, register } from './auth.service.js';
import { credentials, registration } from './auth.validation.js';
import { authenticate, requireRole } from './auth.middleware.js';
import { pool, type Role } from './auth.model.js';
export async function registerAuthEndpoints(app: FastifyInstance) {
  app.post<{ Body: { email: string; password: string; role: Role } }>('/register', { schema: { body: registration } }, async (request, reply) => {
    try {
      const user = await register(request.body.email, request.body.password, request.body.role);
      return reply.code(201).send({ user, token: app.jwt.sign({ sub: user.id, role: user.role }) });
    } catch (error) {
      if ((error as {code?:string}).code === '23505') return reply.code(409).send({ message: 'Account already exists' });
      throw error;
    }
  });
  app.post<{ Body: { email: string; password: string } }>('/login', { schema: { body: credentials } }, async (request, reply) => {
    const user = await login(request.body.email, request.body.password);
    if (!user) return reply.code(401).send({ message: 'Invalid email or password' });
    return { user, token: app.jwt.sign({ sub: user.id, role: user.role }) };
  });
  app.get('/me', { preHandler: authenticate }, async (request, reply) => {
    const result = await pool.query('SELECT id,email,role FROM auth.users WHERE id=$1 AND status=$2', [request.user.sub, 'active']);
    if (!result.rows[0]) return reply.code(401).send({ message: 'Account unavailable' });
    return { user: result.rows[0] };
  });
  for (const role of ['customer', 'driver'] as const) {
    app.get('/access/' + role, { preHandler: requireRole(role) }, async () => ({ role, allowed: true }));
  }
}
