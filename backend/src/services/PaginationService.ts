import { logger } from '../config/logger';

/**
 * Pagination Service
 * Handles cursor-based pagination for list endpoints
 */

export interface PaginationCursor {
  offset: number;
  limit: number;
  total?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    nextCursor?: string;
    previousCursor?: string;
    hasMore: boolean;
    total?: number;
    offset: number;
    limit: number;
  };
}

export interface SortOption {
  field: string;
  direction: 'asc' | 'desc';
}

export interface FilterOption {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains' | 'startsWith' | 'endsWith';
  value: any;
}

/**
 * Pagination Service
 */
export class PaginationService {
  private readonly MAX_LIMIT = 100;
  private readonly DEFAULT_LIMIT = 20;

  /**
   * Encode cursor to base64
   */
  static encodeCursor(offset: number, limit: number): string {
    const data = JSON.stringify({ offset, limit });
    return Buffer.from(data).toString('base64');
  }

  /**
   * Decode cursor from base64
   */
  static decodeCursor(cursor: string): PaginationCursor | null {
    try {
      const data = Buffer.from(cursor, 'base64').toString('utf-8');
      const parsed = JSON.parse(data);
      return {
        offset: parsed.offset || 0,
        limit: parsed.limit || 20,
      };
    } catch (error) {
      logger.warn('Invalid cursor', { cursor });
      return null;
    }
  }

  /**
   * Parse pagination params from query
   */
  parsePaginationParams(query: Record<string, any>): PaginationCursor {
    let offset = 0;
    let limit = this.DEFAULT_LIMIT;

    // Parse from cursor if provided
    if (query.cursor) {
      const decoded = PaginationService.decodeCursor(query.cursor);
      if (decoded) {
        offset = decoded.offset;
        limit = decoded.limit;
      }
    }

    // Parse offset and limit
    if (query.offset) {
      offset = Math.max(0, parseInt(query.offset, 10) || 0);
    }

    if (query.limit) {
      limit = Math.min(this.MAX_LIMIT, Math.max(1, parseInt(query.limit, 10) || this.DEFAULT_LIMIT));
    }

    return { offset, limit };
  }

  /**
   * Create paginated response
   */
  createPaginatedResponse<T>(
    items: T[],
    offset: number,
    limit: number,
    total?: number
  ): PaginatedResponse<T> {
    const hasMore = total ? offset + limit < total : items.length === limit;

    return {
      items,
      pagination: {
        nextCursor: hasMore ? PaginationService.encodeCursor(offset + limit, limit) : undefined,
        previousCursor: offset > 0 ? PaginationService.encodeCursor(Math.max(0, offset - limit), limit) : undefined,
        hasMore,
        total,
        offset,
        limit,
      },
    };
  }

  /**
   * Parse sort options from query
   */
  parseSortOptions(sortQuery?: string): SortOption[] {
    if (!sortQuery) {
      return [];
    }

    return sortQuery.split(',').map(sort => {
      const desc = sort.startsWith('-');
      const field = sort.replace(/^-/, '');

      return {
        field,
        direction: desc ? 'desc' : 'asc',
      };
    });
  }

  /**
   * Parse filter options from query
   */
  parseFilterOptions(filterQuery?: Record<string, any>): FilterOption[] {
    if (!filterQuery || typeof filterQuery !== 'object') {
      return [];
    }

    const filters: FilterOption[] = [];

    Object.keys(filterQuery).forEach(key => {
      const value = filterQuery[key];

      // Parse operator from key (e.g., "email:contains" or "status:eq")
      let field = key;
      let operator: FilterOption['operator'] = 'eq';

      if (key.includes(':')) {
        const [f, op] = key.split(':');
        field = f;
        operator = op as FilterOption['operator'];
      }

      filters.push({
        field,
        operator,
        value,
      });
    });

    return filters;
  }

  /**
   * Apply filters to items (basic in-memory filtering)
   */
  applyFilters<T extends Record<string, any>>(items: T[], filters: FilterOption[]): T[] {
    if (filters.length === 0) {
      return items;
    }

    return items.filter(item => {
      return filters.every(filter => this.matchesFilter(item, filter));
    });
  }

  /**
   * Check if item matches filter
   */
  private matchesFilter<T extends Record<string, any>>(item: T, filter: FilterOption): boolean {
    const itemValue = item[filter.field];

    switch (filter.operator) {
      case 'eq':
        return itemValue === filter.value;
      case 'ne':
        return itemValue !== filter.value;
      case 'gt':
        return itemValue > filter.value;
      case 'gte':
        return itemValue >= filter.value;
      case 'lt':
        return itemValue < filter.value;
      case 'lte':
        return itemValue <= filter.value;
      case 'in':
        return Array.isArray(filter.value) && filter.value.includes(itemValue);
      case 'contains':
        return typeof itemValue === 'string' && itemValue.includes(filter.value);
      case 'startsWith':
        return typeof itemValue === 'string' && itemValue.startsWith(filter.value);
      case 'endsWith':
        return typeof itemValue === 'string' && itemValue.endsWith(filter.value);
      default:
        return true;
    }
  }

  /**
   * Apply sorting to items
   */
  applySorting<T extends Record<string, any>>(items: T[], sortOptions: SortOption[]): T[] {
    if (sortOptions.length === 0) {
      return items;
    }

    const sorted = [...items];

    sortOptions.reverse().forEach(sort => {
      sorted.sort((a, b) => {
        const aVal = a[sort.field];
        const bVal = b[sort.field];

        if (aVal < bVal) return sort.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sort.direction === 'asc' ? 1 : -1;
        return 0;
      });
    });

    return sorted;
  }

  /**
   * Apply pagination to items
   */
  applyPagination<T>(items: T[], offset: number, limit: number): T[] {
    return items.slice(offset, offset + limit);
  }

  /**
   * Process list query with filtering, sorting, and pagination
   */
  processListQuery<T extends Record<string, any>>(
    items: T[],
    query: Record<string, any>
  ): PaginatedResponse<T> {
    // Parse pagination
    const pagination = this.parsePaginationParams(query);

    // Parse sorting
    const sortOptions = this.parseSortOptions(query.sort);

    // Parse filtering
    const filterOptions = this.parseFilterOptions(query.filter);

    // Apply filters
    let filtered = this.applyFilters(items, filterOptions);

    // Apply sorting
    let sorted = this.applySorting(filtered, sortOptions);

    // Get total count before pagination
    const total = sorted.length;

    // Apply pagination
    const paginated = this.applyPagination(sorted, pagination.offset, pagination.limit);

    // Return paginated response
    return this.createPaginatedResponse(paginated, pagination.offset, pagination.limit, total);
  }
}

/**
 * Filter query builder
 */
export class FilterBuilder {
  private filters: Record<string, string> = {};

  /**
   * Add equality filter
   */
  equals(field: string, value: any): this {
    this.filters[field] = value;
    return this;
  }

  /**
   * Add contains filter
   */
  contains(field: string, value: string): this {
    this.filters[`${field}:contains`] = value;
    return this;
  }

  /**
   * Add in filter
   */
  in(field: string, values: any[]): this {
    this.filters[`${field}:in`] = values;
    return this;
  }

  /**
   * Add comparison filter
   */
  compare(field: string, operator: 'gt' | 'gte' | 'lt' | 'lte', value: any): this {
    this.filters[`${field}:${operator}`] = value;
    return this;
  }

  /**
   * Build filter query object
   */
  build(): Record<string, any> {
    return this.filters;
  }
}

/**
 * Sort query builder
 */
export class SortBuilder {
  private sorts: string[] = [];

  /**
   * Add ascending sort
   */
  asc(field: string): this {
    this.sorts.push(field);
    return this;
  }

  /**
   * Add descending sort
   */
  desc(field: string): this {
    this.sorts.push(`-${field}`);
    return this;
  }

  /**
   * Build sort query string
   */
  build(): string {
    return this.sorts.join(',');
  }
}

// Export singleton instance
export const paginationService = new PaginationService();

export default paginationService;
