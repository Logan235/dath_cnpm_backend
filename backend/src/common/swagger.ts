import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiConsumes } from '@nestjs/swagger';

/** Khai báo form upload trên Swagger. extra: các trường text đi kèm (tùy chọn) */
export function ApiFile(field = 'file', multiple = false, extra: Record<string, string> = {}) {
  const fileSchema = multiple
    ? { type: 'array', items: { type: 'string', format: 'binary' } }
    : { type: 'string', format: 'binary' };
  const props: Record<string, any> = { [field]: fileSchema };
  for (const [k, desc] of Object.entries(extra)) props[k] = { type: 'string', description: desc };
  return applyDecorators(
    ApiConsumes('multipart/form-data'),
    ApiBody({ schema: { type: 'object', required: [field], properties: props } }),
  );
}
