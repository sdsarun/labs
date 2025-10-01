import { Module } from '@nestjs/common';
import { FileController } from 'src/file/file.controller';
import { FileService } from 'src/file/file.service';
import { GetFileListByUserIdUsecase } from 'src/file/usecase/get-file-list-by-user-id.usecase';
import { GetPreviewFileByFileIdUsecase } from 'src/file/usecase/get-preview-file-by-file-id.usecase';
import { RequestPresignedUrlUsecase } from 'src/file/usecase/request-presigned-url.usecase';
import { StreamFileByFileIdUsecase } from 'src/file/usecase/stream-file-by-file-id.usecase';
import { UploadFileUsecase } from 'src/file/usecase/upload-file.usecase';
import { StorageModule } from 'src/storage/storage.module';

@Module({
  imports: [StorageModule],
  providers: [
    FileService,
    UploadFileUsecase,
    RequestPresignedUrlUsecase,
    StreamFileByFileIdUsecase,
    GetFileListByUserIdUsecase,
    GetPreviewFileByFileIdUsecase,
  ],
  controllers: [FileController],
})
export class FileModule {}
