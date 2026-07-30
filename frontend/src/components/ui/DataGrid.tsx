import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Search, SlidersHorizontal } from 'lucide-react';
import { Card } from './Card';

export interface Column<T> {
  header: string;
  accessor: keyof T | ((row: T) => React.ReactNode);
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
}

interface DataGridProps<T> {
  data: T[];
  columns: Column<T>[];
  searchPlaceholder?: string;
  searchField?: keyof T | ((row: T) => string);
  actions?: React.ReactNode;
  pageSize?: number;
}

export function DataGrid<T>({
  data,
  columns,
  searchPlaceholder = 'Search records...',
  searchField,
  actions,
  pageSize = 10,
}: DataGridProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});

  // Sorting Handler
  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Find unique values for each string/number accessor to populate filter options dynamically
  const filterOptionsMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    columns.forEach((col) => {
      if (typeof col.accessor === 'string') {
        const key = col.accessor as string;
        const uniqueValues = Array.from(
          new Set(
            data
              .map((row: any) => String(row[key] ?? ''))
              .filter((val) => val.trim() !== '')
          )
        );
        // Provide filter options if there are 2 to 15 unique values in the dataset
        if (uniqueValues.length > 1 && uniqueValues.length <= 15) {
          map[key] = uniqueValues;
        }
      }
    });
    return map;
  }, [data, columns]);

  // Filter & Search Logic
  const filteredData = useMemo(() => {
    let result = data;

    // Apply search query
    if (searchQuery) {
      result = result.filter((row) => {
        if (typeof searchField === 'function') {
          return searchField(row).toLowerCase().includes(searchQuery.toLowerCase());
        } else if (searchField) {
          const val = row[searchField];
          return String(val ?? '').toLowerCase().includes(searchQuery.toLowerCase());
        }
        
        return Object.values(row as object).some((val) =>
          String(val ?? '').toLowerCase().includes(searchQuery.toLowerCase())
        );
      });
    }

    // Apply active column filters
    Object.entries(activeFilters).forEach(([key, filterVal]) => {
      if (filterVal) {
        result = result.filter((row: any) => String(row[key] ?? '') === filterVal);
      }
    });

    return result;
  }, [data, searchQuery, searchField, activeFilters]);

  // Sort Logic
  const sortedData = useMemo(() => {
    if (!sortConfig) return filteredData;

    return [...filteredData].sort((a: any, b: any) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [filteredData, sortConfig]);

  // Pagination Logic
  const totalPages = Math.ceil(sortedData.length / pageSize);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  return (
    <Card variant="default" padding="none" className="w-full">
      {/* Search and Filters Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-b border-forgeGray-100 dark:border-forgeGray-800/80 gap-3">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-forgeGray-400" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 text-sm bg-forgeGray-50 dark:bg-forgeGray-800/40 border border-forgeGray-200 dark:border-forgeGray-700/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary dark:text-white"
          />
        </div>
        <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
          {actions}
          <button
            onClick={() => setShowFilterPanel(!showFilterPanel)}
            title="Toggle filters"
            aria-label="Toggle filters"
            className={`p-2 border rounded-xl transition-all duration-200 cursor-pointer ${
              showFilterPanel
                ? 'bg-primary border-primary text-forgeGray-950 font-bold shadow-md3-1'
                : 'border-forgeGray-250 dark:border-forgeGray-700 hover:bg-forgeGray-50 dark:hover:bg-forgeGray-800 text-forgeGray-500'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilterPanel && Object.keys(filterOptionsMap).length > 0 && (
        <div className="flex flex-wrap items-center gap-3 p-4 bg-forgeGray-50/50 dark:bg-forgeGray-800/10 border-b border-forgeGray-100 dark:border-forgeGray-800/80">
          <span className="text-xs font-bold text-forgeGray-450 dark:text-forgeGray-400 uppercase tracking-wider">
            Filter by:
          </span>
          {Object.entries(filterOptionsMap).map(([key, options]) => {
            const col = columns.find((c) => c.accessor === key);
            if (!col) return null;
            return (
              <div key={key} className="flex items-center space-x-1.5 bg-white dark:bg-slate-900 border border-forgeGray-200 dark:border-forgeGray-700/60 rounded-xl px-2.5 py-1 text-xs">
                <span className="font-bold text-forgeGray-500 dark:text-forgeGray-400">
                  {col.header}:
                </span>
                <select
                  title={`Filter by ${col.header}`}
                  value={activeFilters[key] || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setActiveFilters((prev) => {
                      const next = { ...prev };
                      if (val) {
                        next[key] = val;
                      } else {
                        delete next[key];
                      }
                      return next;
                    });
                    setCurrentPage(1);
                  }}
                  className="bg-transparent border-none focus:outline-none font-bold text-forgeGray-850 dark:text-white"
                >
                  <option value="">All</option>
                  {options.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
          {Object.keys(activeFilters).length > 0 && (
            <button
              onClick={() => {
                setActiveFilters({});
                setCurrentPage(1);
              }}
              className="text-xs font-black text-rose-500 dark:text-rose-450 hover:underline cursor-pointer px-2"
            >
              Clear Filters
            </button>
          )}
        </div>
      )}
      {showFilterPanel && Object.keys(filterOptionsMap).length === 0 && (
        <div className="p-3 text-center text-xs text-forgeGray-450 dark:text-forgeGray-500 border-b border-forgeGray-100 dark:border-forgeGray-800/80">
          No filterable columns found for these records.
        </div>
      )}

      {/* Table Area */}
      <div className="overflow-x-auto w-full">
        <table className="w-full text-sm text-left text-forgeGray-500 dark:text-forgeGray-350">
          <thead className="text-xs text-forgeGray-700 dark:text-forgeGray-400 uppercase bg-forgeGray-50/50 dark:bg-forgeGray-800/20 border-b border-forgeGray-100 dark:border-forgeGray-800/80">
            <tr>
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  onClick={() => col.sortable && typeof col.accessor === 'string' && handleSort(col.accessor as string)}
                  className={`px-6 py-4 font-bold tracking-wider ${
                    col.sortable ? 'cursor-pointer select-none hover:text-forgeGray-950 dark:hover:text-white' : ''
                  } ${
                    col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'
                  }`}
                >
                  <div className="flex items-center space-x-1">
                    <span>{col.header}</span>
                    {col.sortable && sortConfig && sortConfig.key === col.accessor && (
                      <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-forgeGray-100 dark:divide-forgeGray-800/60">
            {paginatedData.length > 0 ? (
              paginatedData.map((row, rowIdx) => (
                <tr key={rowIdx} className="hover:bg-forgeGray-50/30 dark:hover:bg-forgeGray-800/10 transition-colors">
                  {columns.map((col, colIdx) => {
                    let content: React.ReactNode;
                    if (typeof col.accessor === 'function') {
                      content = col.accessor(row);
                    } else {
                      content = String((row as any)[col.accessor] ?? '');
                    }
                    
                    return (
                      <td
                        key={colIdx}
                        className={`px-6 py-4 font-medium text-forgeGray-900 dark:text-forgeGray-200 whitespace-nowrap ${
                          col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'
                        }`}
                      >
                        {content}
                      </td>
                    );
                  })}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center text-forgeGray-450 dark:text-forgeGray-500">
                  No records found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between p-4 border-t border-forgeGray-100 dark:border-forgeGray-800/80 bg-forgeGray-50/20 dark:bg-forgeGray-800/5">
          <span className="text-xs text-forgeGray-500 dark:text-forgeGray-450">
            Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> (<strong>{sortedData.length}</strong> total records)
          </span>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              title="First Page"
              aria-label="First page"
              className="p-1.5 border border-forgeGray-200 dark:border-forgeGray-700/60 hover:bg-forgeGray-100 dark:hover:bg-forgeGray-800 rounded-lg text-forgeGray-500 disabled:opacity-40"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              title="Previous Page"
              aria-label="Previous page"
              className="p-1.5 border border-forgeGray-200 dark:border-forgeGray-700/60 hover:bg-forgeGray-100 dark:hover:bg-forgeGray-800 rounded-lg text-forgeGray-500 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              title="Next Page"
              aria-label="Next page"
              className="p-1.5 border border-forgeGray-200 dark:border-forgeGray-700/60 hover:bg-forgeGray-100 dark:hover:bg-forgeGray-800 rounded-lg text-forgeGray-500 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              title="Last Page"
              aria-label="Last page"
              className="p-1.5 border border-forgeGray-200 dark:border-forgeGray-700/60 hover:bg-forgeGray-100 dark:hover:bg-forgeGray-800 rounded-lg text-forgeGray-500 disabled:opacity-40"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}
