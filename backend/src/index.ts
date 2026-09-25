import 'dotenv/config';
import { createApp } from './app';
import { env } from './config/env';
import { connectRedis } from './config/redis';
import { prisma } from './config/database';

async function bootstrap() {
  // Verify database connection
  await prisma.$connect();
  console.log('✅ Database connected');

  // Connect Redis
  await connectRedis();
  console.log('✅ Redis connected');

  const app = createApp();

  app.listen(env.PORT, () => {
    console.log(`🚀 Server running on http://localhost:${env.PORT}`);
    console.log(`   Environment: ${env.NODE_ENV}`);
  });
}

bootstrap().catch((err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});
