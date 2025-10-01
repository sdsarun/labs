import { File } from 'node:buffer';

export function multerToFile(multerFile: Express.Multer.File): File {
  // Explicit runtime check
  if (!multerFile.buffer) {
    throw new Error(`File ${multerFile.originalname} has no buffer`);
  }

  // Use "!" non-null assertion to satisfy ESLint
  return new File([multerFile.buffer!], multerFile.originalname, {
    type: multerFile.mimetype,
  });
}
