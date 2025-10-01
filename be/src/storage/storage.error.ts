import { HttpStatus } from '@nestjs/common';
import { BaseError } from 'src/core/base.error';

export class InvalidPresignedUrlMode extends BaseError {
  code: string = 'INVALID_MODE_PRESIGNED_URL';
  message: string = 'Invalid presigned url mode.';
  statusCode: number = HttpStatus.BAD_REQUEST;
}
