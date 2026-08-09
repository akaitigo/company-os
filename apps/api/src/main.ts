import 'reflect-metadata';
import helmet from '@fastify/helmet';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module.js';
import { loadFileBackedSecret } from './runtime-config.js';

loadFileBackedSecret('DATABASE_URL');
const adapter = new FastifyAdapter({ bodyLimit: 1_048_576, requestTimeout: 10_000 });
const app = await NestFactory.create<NestFastifyApplication>(AppModule, adapter, {
  bufferLogs: true,
});
await app.register(helmet, { contentSecurityPolicy: true });
app.enableShutdownHooks();
await app.listen({
  port: Number(process.env['PORT'] ?? 3001),
  host: process.env['API_HOST'] ?? '127.0.0.1',
});
