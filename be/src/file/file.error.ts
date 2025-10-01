import { HttpStatus } from '@nestjs/common';
import { BaseError } from 'src/core/base.error';

export class FileNotFoundError extends BaseError {
  code: string = 'FILE_NOT_FOUND_ERROR';
  message: string = 'This file does not exists anymore.';
  statusCode: number = HttpStatus.NOT_FOUND;
}
