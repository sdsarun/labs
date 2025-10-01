import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();

  const port = process.env.PORT ?? 3000;
  const hostname = process.env.HOSTNAME ?? '0.0.0.0';

  await app.listen(port, hostname);
  const url = await app.getUrl();
  Logger.log(`Application is listening on ${url}`, bootstrap.name);
}
void bootstrap();
