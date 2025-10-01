import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { StorageModule } from 'src/storage/storage.module';
import { FileModule } from 'src/file/file.module';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  imports: [DatabaseModule, StorageModule, FileModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
