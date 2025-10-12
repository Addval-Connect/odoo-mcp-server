/**
 * Odoo Response Sanitizer
 * Cleans and normalizes Odoo responses for safe MCP transmission
 */

// Fields that are typically large binary blobs - always drop these
const BINARY_FIELDS = new Set([
  'image_1920',
  'image_1024',
  'image_512',
  'image_256',
  'image_128',
  'datas',
  'attachment',
  'content',
  'binary',
  'file',
  'pdf_content',
  'report_file',
]);

// Maximum limits for safety (ChatGPT-optimized: smaller defaults)
const MAX_RECORDS = 100;  // Reduced from 200 for ChatGPT compatibility
const DEFAULT_LIMIT = 10; // Reduced from 50 - ChatGPT prefers smaller payloads
const MAX_STRING_LENGTH = 5000; // Reduced from 10000 - avoid massive text fields

export interface SanitizeOptions {
  limit?: number;
  fields?: string[];
  dropBinary?: boolean;
  normalizeRelations?: boolean;
  maxStringLength?: number;
}

/**
 * Normalizes a Many2one or One2many field value
 * Converts [id, name] tuples to {id, name} objects
 */
function normalizeRelation(value: any): any {
  if (Array.isArray(value)) {
    if (value.length === 2 && typeof value[0] === 'number') {
      // Many2one: [id, "name"] -> {id, name}
      return { id: value[0], name: value[1] };
    } else if (value.length > 0 && typeof value[0] === 'number') {
      // One2many/Many2many: [id1, id2, ...] -> just return array of ids
      return value;
    }
  }
  return value;
}

/**
 * Checks if a value is a binary type
 */
function isBinary(value: any): boolean {
  if (value === null || value === undefined) return false;
  if (Buffer.isBuffer(value)) return true;
  if (value instanceof Uint8Array) return true;
  if (typeof value === 'string' && value.length > 1000 && /^[A-Za-z0-9+/]+=*$/.test(value.slice(0, 100))) {
    // Likely base64 encoded binary
    return true;
  }
  return false;
}

/**
 * Sanitizes a single record
 */
function sanitizeRecord(
  record: any,
  options: SanitizeOptions = {}
): any {
  const {
    dropBinary = true,
    normalizeRelations = true,
    maxStringLength = MAX_STRING_LENGTH,
  } = options;

  if (!record || typeof record !== 'object') {
    return record;
  }

  const sanitized: any = {};

  for (const [key, value] of Object.entries(record)) {
    // Skip binary fields
    if (dropBinary && (BINARY_FIELDS.has(key) || isBinary(value))) {
      continue;
    }

    let processedValue = value;

    // Normalize relations (Many2one, One2many, Many2many)
    if (normalizeRelations && (Array.isArray(value) || (typeof value === 'object' && value !== null))) {
      processedValue = normalizeRelation(value);
    }

    // Truncate very long strings
    if (typeof processedValue === 'string' && processedValue.length > maxStringLength) {
      processedValue = processedValue.slice(0, maxStringLength) + '... [truncated]';
    }

    // Recursively sanitize nested objects (but not relations which we already normalized)
    if (typeof processedValue === 'object' && processedValue !== null && !Array.isArray(processedValue) && !('id' in processedValue)) {
      processedValue = sanitizeRecord(processedValue, options);
    }

    sanitized[key] = processedValue;
  }

  return sanitized;
}

/**
 * Sanitizes an array of Odoo records
 * - Limits number of records
 * - Filters to requested fields
 * - Drops binary fields
 * - Normalizes relations
 * - Truncates long strings
 */
export function sanitizeOdooRecords(
  records: any[],
  options: SanitizeOptions = {}
): any[] {
  if (!Array.isArray(records)) {
    return [];
  }

  const {
    limit = DEFAULT_LIMIT,
    fields,
  } = options;

  // Apply limit (capped at MAX_RECORDS)
  const effectiveLimit = Math.min(Math.max(1, limit), MAX_RECORDS);
  let limitedRecords = records.slice(0, effectiveLimit);

  // Filter to requested fields if specified
  if (fields && fields.length > 0) {
    const fieldSet = new Set(fields);
    // Always include 'id' if present
    fieldSet.add('id');
    
    limitedRecords = limitedRecords.map(record => {
      const filtered: any = {};
      for (const field of fieldSet) {
        if (field in record) {
          filtered[field] = record[field];
        }
      }
      return filtered;
    });
  }

  // Sanitize each record
  return limitedRecords.map(record => sanitizeRecord(record, options));
}

/**
 * Enforces safe limit value
 */
export function enforceSafeLimit(limit?: number): number {
  if (limit === undefined || limit === null) {
    return DEFAULT_LIMIT;
  }
  return Math.min(Math.max(1, limit), MAX_RECORDS);
}

/**
 * Gets statistics about sanitized data
 */
export function getSanitizationStats(
  originalRecords: any[],
  sanitizedRecords: any[]
): {
  originalCount: number;
  sanitizedCount: number;
  recordsDropped: number;
  estimatedSizeReduction: string;
} {
  const originalSize = JSON.stringify(originalRecords).length;
  const sanitizedSize = JSON.stringify(sanitizedRecords).length;
  const reduction = originalSize > 0 
    ? ((1 - sanitizedSize / originalSize) * 100).toFixed(1) + '%'
    : '0%';

  return {
    originalCount: originalRecords.length,
    sanitizedCount: sanitizedRecords.length,
    recordsDropped: originalRecords.length - sanitizedRecords.length,
    estimatedSizeReduction: reduction,
  };
}
