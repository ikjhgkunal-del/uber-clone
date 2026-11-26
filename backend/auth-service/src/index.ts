import Fastify, { type FastifyError } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import { pool } from './auth.model.js';
import { authRoutes } from './auth.routes.js';
const secret = process.env.JWT_SECRET;
if (!secret || secret.length < 32) throw new Error('JWT_SECRET must contain at least 32 characters');
const app = Fastify({ logger: { redact: ['req.headers.authorization', 'req.headers.cookie', 'password', 'password_hash', 'token'] }, bodyLimit: 16384 });
await app.register(helmet);
await app.register(cors, { origin: process.env.CORS_ORIGIN?.split(',') ?? false });
await app.register(rateLimit, { max: 30, timeWindow: '1 minute' });
await app.register(jwt, { secret, sign: { expiresIn: '15m', iss: 'uber-auth', aud: 'uber-api' }, verify: { allowedIss: 'uber-auth', allowedAud: 'uber-api' } });
app.get('/health', async () => ({ service: 'auth-service', status: 'ok' }));
app.get('/ready', async (_, reply) => {
  try { await pool.query('SELECT 1 FROM auth.users LIMIT 1'); return { status: 'ready' }; }
  catch { return reply.code(503).send({ status: 'unavailable' }); }
});
await app.register(authRoutes);
app.setErrorHandler((error, request, reply) => {
  request.log.error(error);
  const failure = error as FastifyError;
  reply.code(failure.statusCode && failure.statusCode < 500 ? failure.statusCode : 500).send({ message: failure.validation ? 'Invalid request' : 'Request failed' });
});
app.addHook('onClose', async () => { await pool.end(); });
await app.listen({ host: '0.0.0.0', port: Number(process.env.PORT ?? 3001) });
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, () => { void app.close(); });
