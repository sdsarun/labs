import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MulterModule } from '@nestjs/platform-express';
import multer from 'multer';
import { randomUUID } from 'node:crypto';

@Module({
  imports: [
    MulterModule.register({
      storage: multer.diskStorage({
        destination: 'temp/files-uploaded',
        filename: (_, __, cb) => {
          cb(null, randomUUID());
        },
      }),
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
