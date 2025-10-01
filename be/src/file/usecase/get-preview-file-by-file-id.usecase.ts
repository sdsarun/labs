import { Injectable } from '@nestjs/common';
import { BaseError } from 'src/core/base.error';
import { Usecase } from 'src/core/usecase.abstract';
import { PrismaService } from 'src/database/prisma.service';
import { StorageService } from 'src/storage/storage.abstract';

@Injectable()
export class GetPreviewFileByFileIdUsecase extends Usecase {
  constructor(
    private readonly storage: StorageService,
    private readonly db: PrismaService,
  ) {
    super();
  }

  async execute(param: { fileId: string }) {
    const { fileId } = param;

    const file = await this.db.file.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      throw new BaseError({
        statusCode: 404,
        message: 'File not found',
      });
    }

    if (file.status !== 'UPLOADED') {
      throw new BaseError({
        statusCode: 400,
        message: 'File is not uploaded yet',
      });
    }

    const previewUrl = await this.storage.presignedUrl({
      mode: 'download',
      name: file.path!,
      resHeader: {
        'response-content-disposition': `inline; filename="${file.filename}"`,
      },
    });

    return { previewUrl };
  }
}
