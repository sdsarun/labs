/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable } from '@nestjs/common';
import { FileStatus, Prisma } from 'generated/prisma';
import { Usecase } from 'src/core/usecase.abstract';
import { PrismaService } from 'src/database/prisma.service';
import { StorageService } from 'src/storage/storage.abstract';
import crypto from 'crypto';

export type UploadFileParam = {
  mode: 'init' | 'complete' | 'fail';
  userId?: string; // Add userId for init
  files?: { filename: string; mimetype: string; size: number }[]; // for init
  fileIds?: string[]; // for complete/fail
};

export type UploadFileResult = {
  fileId: string;
  objectKey: string;
  presignedUrl?: string;
  status: FileStatus;
};

@Injectable()
export class UploadFileUsecase extends Usecase<
  UploadFileParam,
  UploadFileResult[]
> {
  constructor(
    private readonly storage: StorageService,
    private readonly db: PrismaService,
  ) {
    super();
  }

  async execute(param: UploadFileParam): Promise<UploadFileResult[]> {
    switch (param.mode) {
      case 'init': {
        const userId = param.userId;
        if (!userId) {
          throw new Error('userId is required for init mode');
        }

        if (!param.files || param.files.length === 0) return [];

        const prepared: Prisma.FileCreateManyInput[] = param.files.map(
          (file) => {
            const objectKey = `${process.env.STORAGE_PREFIX_PATH}/${crypto.randomUUID()}`;
            return {
              filename: file.filename,
              mimetype: file.mimetype,
              size: file.size,
              status: FileStatus.PENDING,
              path: objectKey,
              userId,
            };
          },
        );

        // Create DB records
        await this.db.file.createMany({ data: prepared });

        // Generate presigned URLs
        const presignedResults: UploadFileResult[] = await Promise.all(
          prepared.map(async (file) => {
            const presignedUrl = await this.storage.presignedUrl({
              mode: 'upload',
              name: file.path!,
            });
            return {
              fileId: file.path!,
              objectKey: file.path!,
              presignedUrl,
              status: FileStatus.PENDING,
            };
          }),
        );

        return presignedResults;
      }

      case 'complete': {
        if (!param.fileIds || param.fileIds.length === 0) return [];

        await this.db.file.updateMany({
          where: { path: { in: param.fileIds } },
          data: { status: FileStatus.UPLOADED },
        });

        return param.fileIds.map((id) => ({
          fileId: id,
          objectKey: id,
          status: FileStatus.UPLOADED,
        }));
      }

      case 'fail': {
        if (!param.fileIds || param.fileIds.length === 0) return [];

        await this.db.file.updateMany({
          where: { path: { in: param.fileIds } },
          data: { status: FileStatus.FAILED },
        });

        return param.fileIds.map((id) => ({
          fileId: id,
          objectKey: id,
          status: FileStatus.FAILED,
        }));
      }

      default:
        return [];
    }
  }
}
