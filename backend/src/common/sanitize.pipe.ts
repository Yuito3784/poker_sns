import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';
import sanitizeHtml from 'sanitize-html';

/** サーバー生成のパス・URL は sanitize で変形されると API バリデーションと不整合になるためそのまま通す */
const SKIP_SANITIZE_STRING_KEYS = new Set(['imageUrl']);

@Injectable()
export class SanitizeInputPipe implements PipeTransform {
  transform(value: unknown, metadata: ArgumentMetadata) {
    if (metadata.type !== 'body') return value;
    if (typeof value === 'object' && value !== null) {
      return this.sanitizeObject(value as Record<string, unknown>);
    }
    return value;
  }

  private sanitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(obj)) {
      if (typeof val === 'string') {
        if (SKIP_SANITIZE_STRING_KEYS.has(key)) {
          result[key] = val;
        } else {
          result[key] = sanitizeHtml(val, { allowedTags: [], allowedAttributes: {} });
        }
      } else if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
        result[key] = this.sanitizeObject(val as Record<string, unknown>);
      } else if (Array.isArray(val)) {
        result[key] = val.map((item) =>
          typeof item === 'string'
            ? sanitizeHtml(item, { allowedTags: [], allowedAttributes: {} })
            : typeof item === 'object' && item !== null
              ? this.sanitizeObject(item as Record<string, unknown>)
              : item,
        );
      } else {
        result[key] = val;
      }
    }
    return result;
  }
}
