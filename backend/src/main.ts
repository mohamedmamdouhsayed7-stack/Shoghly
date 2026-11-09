import "reflect-metadata";
import { json } from "express";
import helmet from "helmet";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";
import { StructuredLogger } from "./common/structured-logger";
import { HttpExceptionFilter } from "./common/http-exception.filter";
import { requestContext } from "./common/request-context";
import type { BackendEnvironment } from "./config/environment";

async function bootstrap() {
  const logger = new StructuredLogger();
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
    logger,
  });
  const env = app.get<BackendEnvironment>("BACKEND_ENV");
  app.use(requestContext);
  app.use(json({ limit: "32kb", strict: true }));
  app.use(helmet({ crossOriginResourcePolicy: { policy: "same-site" } }));
  app.enableCors({
    origin: [env.FRONTEND_ORIGIN],
    methods: ["GET", "POST", "PATCH", "OPTIONS"],
    allowedHeaders: ["Authorization", "Content-Type", "Idempotency-Key"],
    exposedHeaders: ["x-request-id"],
    credentials: false,
    maxAge: 600,
  });
  app.setGlobalPrefix("api/v1");
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableShutdownHooks();
  const host =
    env.APP_ENV === "development" || env.APP_ENV === "test"
      ? "127.0.0.1"
      : "0.0.0.0";
  await app.listen(env.PORT, host);
  logger.log({ event: "api_listening", port: env.PORT, host }, "Bootstrap");
}

void bootstrap().catch((error: unknown) => {
  const safeMessage = error instanceof Error ? error.message : "startup_failed";
  process.stderr.write(
    `${JSON.stringify({ level: "fatal", context: "Bootstrap", message: safeMessage })}\n`,
  );
  process.exitCode = 1;
});
