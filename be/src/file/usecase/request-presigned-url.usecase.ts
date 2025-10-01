import { Injectable } from '@nestjs/common';
import { Usecase } from 'src/core/usecase.abstract';
import {
  PresignedUrlParam,
  StorageService,
} from 'src/storage/storage.abstract';

@Injectable()
export class RequestPresignedUrlUsecase extends Usecase<PresignedUrlParam> {
  constructor(private readonly storage: StorageService) {
    super();
  }

  async execute(
    param: PresignedUrlParam,
  ): Promise<{ objectKey: string; presignedUrl: string }> {
    const { mode } = param;
    const objectKey = `upload/` + crypto.randomUUID();
    const presignedUrl = await this.storage.presignedUrl({
      mode,
      name: objectKey,
    });
    return { objectKey, presignedUrl };
  }
}
