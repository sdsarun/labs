import { Module } from '@nestjs/common';
import { MinioService } from 'src/storage/minio.service';
import { StorageService } from 'src/storage/storage.abstract';

@Module({
  imports: [],
  providers: [
    {
      provide: StorageService,
      useClass: MinioService,
    },
  ],
  exports: [
    {
      provide: StorageService,
      useClass: MinioService,
    },
  ],
})
export class StorageModule {}
