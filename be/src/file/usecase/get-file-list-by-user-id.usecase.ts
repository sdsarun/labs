/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable } from '@nestjs/common';
import { File, FileStatus } from 'generated/prisma';
import { Usecase } from 'src/core/usecase.abstract';
import { PrismaService } from 'src/database/prisma.service';

@Injectable()
export class GetFileListByUserIdUsecase extends Usecase {
  constructor(private readonly db: PrismaService) {
    super();
  }

  execute(param: { userId: string; query?: any }): Promise<File[]> {
    const where = { userId: param.userId };

    if (param.query?.status) {
      where['status'] = param.query?.status as FileStatus;
    }

    return this.db.file.findMany({
      where,
    });
  }
}
