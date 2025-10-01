import { Injectable } from '@nestjs/common';
import { StorageService } from 'src/storage/storage.abstract';

@Injectable()
export class FileService {
  constructor(private readonly storage: StorageService) {}

  async uploadFile(files: Express.Multer.File[]) {}
}
