/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-floating-promises */

import { Injectable } from '@nestjs/common';
import Stream from 'node:stream';
import { Usecase } from 'src/core/usecase.abstract';
import { PrismaService } from 'src/database/prisma.service';
import { FileNotFoundError } from 'src/file/file.error';
import { StorageService } from 'src/storage/storage.abstract';

@Injectable()
export class StreamFileByFileIdUsecase extends Usecase {
  constructor(
    private readonly storage: StorageService,
    private readonly db: PrismaService,
  ) {
    super();
  }

  async execute(dto: any): Promise<{ stream: Stream }> {
    const file = await this.db.file.findFirst({
      where: {
        id: dto?.fileId,
      },
    });

    if (!file) {
      throw new FileNotFoundError();
    }

    const stream = await this.storage.getObject({ objectName: dto.fileId });
    return { stream };
  }
}
