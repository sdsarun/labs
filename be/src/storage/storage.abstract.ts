import { Logger } from '@nestjs/common';
import { Readable } from 'node:stream';

export type GetObjectParam = {
  objectName: string;
};

export type PresignedUrlParam = {
  mode: 'upload' | 'download';
  name: string;
  resHeader?: Record<string, string>;
};

export type RemoveObject = {
  name: string;
};

export type RemoveObjectsParam = {
  objects: RemoveObject[];
};

export abstract class StorageService {
  constructor() {
    Logger.log(StorageService.name + ' initialize');
  }

  abstract health(): Promise<boolean>;
  abstract getObject(param: GetObjectParam): Promise<Readable>;
  abstract removeObjects(param: RemoveObjectsParam): Promise<void>;
  abstract presignedUrl(param: PresignedUrlParam): Promise<string>;
}
