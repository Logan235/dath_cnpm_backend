// Upload file (multer) + trích xuất văn bản từ PDF / Word (.docx, .doc) / TXT
import { BadRequestException, Injectable } from '@nestjs/common';
import { diskStorage } from 'multer';
import { existsSync, mkdirSync, readFileSync } from 'fs';
import { extname, join } from 'path';
import { randomBytes } from 'crypto';

export const UPLOAD_ROOT = join(process.cwd(), 'uploads');

function ensureDir(dir: string) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

/** Tên file gốc từ multer bị mã hóa latin1 -> đổi về utf8 để giữ tiếng Việt */
export function originalName(file: Express.Multer.File): string {
  try {
    return Buffer.from(file.originalname, 'latin1').toString('utf8');
  } catch {
    return file.originalname;
  }
}

export const DOC_EXT = ['.pdf', '.docx', '.doc', '.txt'];
export const IMAGE_EXT = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
export const MEDIA_EXT = [...IMAGE_EXT, '.mp4', '.mov', '.mp3', '.wav'];
export const SHEET_EXT = ['.xlsx'];

/** Cấu hình multer: lưu vào uploads/<thư mục con>/<tên ngẫu nhiên>.<đuôi> */
export function uploadOptions(subDir: string, allowed: string[], maxMb = 20) {
  return {
    storage: diskStorage({
      destination: (_req, _file, cb) => {
        const dir = join(UPLOAD_ROOT, subDir);
        ensureDir(dir);
        cb(null, dir);
      },
      filename: (_req, file, cb) => {
        cb(null, `${Date.now()}-${randomBytes(4).toString('hex')}${extname(file.originalname).toLowerCase()}`);
      },
    }),
    limits: { fileSize: maxMb * 1024 * 1024 },
    fileFilter: (_req: any, file: Express.Multer.File, cb: (e: Error | null, ok: boolean) => void) => {
      const ext = extname(file.originalname).toLowerCase();
      if (!allowed.includes(ext)) {
        return cb(new BadRequestException(`Chỉ chấp nhận file: ${allowed.join(', ')}`), false);
      }
      cb(null, true);
    },
  };
}

/** Đường dẫn công khai để tải file: /uploads/<subDir>/<file> */
export function publicPath(file: Express.Multer.File): string {
  const rel = file.path.replace(UPLOAD_ROOT, '').replace(/\\/g, '/');
  return `/uploads${rel.startsWith('/') ? '' : '/'}${rel}`;
}

export function fileInfo(file: Express.Multer.File) {
  return {
    name: originalName(file),
    url: publicPath(file),
    size: file.size,
    mimeType: file.mimetype,
  };
}

@Injectable()
export class DocumentTextService {
  /** Đọc toàn bộ chữ trong file PDF / DOCX / DOC / TXT */
  async extractText(file: Express.Multer.File): Promise<string> {
    const ext = extname(file.originalname).toLowerCase();
    try {
      if (ext === '.pdf') {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const pdfParse = require('pdf-parse/lib/pdf-parse.js');
        const out = await pdfParse(readFileSync(file.path));
        return clean(out.text);
      }
      if (ext === '.docx') {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const mammoth = require('mammoth');
        const out = await mammoth.extractRawText({ path: file.path });
        return clean(out.value);
      }
      if (ext === '.doc') {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const WordExtractor = require('word-extractor');
        const doc = await new WordExtractor().extract(file.path);
        return clean(doc.getBody());
      }
      if (ext === '.txt') return clean(readFileSync(file.path, 'utf8'));
    } catch (e) {
      throw new BadRequestException(`Không đọc được nội dung file (${(e as Error).message})`);
    }
    throw new BadRequestException('Định dạng file không hỗ trợ trích xuất văn bản');
  }
}

function clean(s: string): string {
  return (s || '')
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
