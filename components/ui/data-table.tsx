"use client";

import { ArrowDown, ArrowUp, ChevronsUpDown, Columns3, Search } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import { Button } from "./button";
import { Checkbox } from "./checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import { Input, Select } from "./input";
import { Skeleton } from "./skeleton";
import { EmptyState, ErrorState } from "./states";
import { cn } from "@/lib/utils";

export interface DataTableColumn<T> {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number;
  align?: "left" | "right" | "center";
  className?: string;
  headerClassName?: string;
  defaultHidden?: boolean;
  hideable?: boolean;
}

export interface DataTableProps<T> {
  data: T[] | undefined;
  columns: DataTableColumn<T>[];
  getRowId: (row: T) => string;
  loading?: boolean;
  error?: unknown;
  errorTitle?: string;
  errorDescription?: string;
  onRetry?: () => void;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchText?: (row: T) => string;
  toolbar?: ReactNode;
  filters?: ReactNode;
  actions?: ReactNode;
  pageSize?: number;
  pageSizeOptions?: number[];
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: ReactNode;
  onRowClick?: (row: T) => void;
  initialSort?: { key: string; direction: "asc" | "desc" };
  minWidthClassName?: string;
  caption?: string;
  dense?: boolean;
}

const ALIGN: Record<NonNullable<DataTableColumn<unknown>["align"]>, string> = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
};

function defaultSearchText<T>(row: T): string {
  if (row && typeof row === "object") {
    return Object.values(row as Record<string, unknown>)
      .map((value) => (value === null || value === undefined ? "" : String(value)))
      .join(" ")
      .toLowerCase();
  }
  return String(row).toLowerCase();
}

export function DataTable<T>({
  data,
  columns,
  getRowId,
  loading,
  error,
  errorTitle = "Unable to load data",
  errorDescription,
  onRetry,
  searchable = true,
  searchPlaceholder = "Search…",
  searchText,
  toolbar,
  filters,
  actions,
  pageSize = 10,
  pageSizeOptions = [10, 25, 50, 100],
  emptyTitle = "Nothing to show",
  emptyDescription,
  emptyIcon,
  onRowClick,
  initialSort,
  minWidthClassName = "min-w-[720px]",
  caption,
  dense,
}: DataTableProps<T>) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: string; direction: "asc" | "desc" } | undefined>(initialSort);
  const [size, setSize] = useState(pageSize);
  const [page, setPage] = useState(1);
  const [hidden, setHidden] = useState<Set<string>>(
    () => new Set(columns.filter((column) => column.defaultHidden).map((column) => column.key)),
  );

  const visibleColumns = useMemo(() => columns.filter((column) => !hidden.has(column.key)), [columns, hidden]);

  const filtered = useMemo(() => {
    const rows = data ?? [];
    const term = query.trim().toLowerCase();
    if (!term) return rows;
    const extract = searchText ?? defaultSearchText<T>;
    return rows.filter((row) => extract(row).toLowerCase().includes(term));
  }, [data, query, searchText]);

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const column = columns.find((entry) => entry.key === sort.key);
    if (!column?.sortValue) return filtered;
    const factor = sort.direction === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const left = column.sortValue?.(a) ?? "";
      const right = column.sortValue?.(b) ?? "";
      if (typeof left === "number" && typeof right === "number") return (left - right) * factor;
      return String(left).localeCompare(String(right)) * factor;
    });
  }, [filtered, sort, columns]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / size));
  const safePage = Math.min(page, totalPages);
  const paged = useMemo(
    () => sorted.slice((safePage - 1) * size, safePage * size),
    [sorted, safePage, size],
  );

  function toggleSort(column: DataTableColumn<T>) {
    if (!column.sortValue) return;
    setPage(1);
    setSort((current) => {
      if (current?.key !== column.key) return { key: column.key, direction: "asc" };
      if (current.direction === "asc") return { key: column.key, direction: "desc" };
      return undefined;
    });
  }

  const showToolbar = searchable || toolbar || filters || actions || columns.some((c) => c.hideable);

  return (
    <div>
      {showToolbar ? (
        <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center">
          {searchable ? (
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-content-disabled" />
              <Input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                placeholder={searchPlaceholder}
                className="h-9 pl-9"
                aria-label="Search table"
              />
            </div>
          ) : null}
          {filters ? <div className="flex flex-wrap items-center gap-2">{filters}</div> : null}
          <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
            {toolbar}
            {columns.some((column) => column.hideable) ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Columns3 className="h-3.5 w-3.5" />
                    Columns
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuLabel>Visible columns</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {columns
                    .filter((column) => column.hideable)
                    .map((column) => (
                      <label
                        key={column.key}
                        className="flex cursor-pointer items-center gap-2 rounded-control px-2.5 py-1.5 text-sm text-content-muted hover:bg-surface-muted"
                      >
                        <Checkbox
                          checked={!hidden.has(column.key)}
                          onCheckedChange={(checked) =>
                            setHidden((current) => {
                              const next = new Set(current);
                              if (checked) next.delete(column.key);
                              else next.add(column.key);
                              return next;
                            })
                          }
                        />
                        <span className="truncate">{column.header}</span>
                      </label>
                    ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
            {actions}
          </div>
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-2.5 p-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
      ) : error ? (
        <ErrorState
          title={errorTitle}
          description={errorDescription}
          onRetry={onRetry}
        />
      ) : sorted.length === 0 ? (
        <EmptyState
          icon={emptyIcon}
          title={data && data.length > 0 ? "No matching results" : emptyTitle}
          description={data && data.length > 0 ? "Adjust your search or filters." : emptyDescription}
        />
      ) : (
        <>
          <div className="overflow-x-auto orbit-scroll">
            <table className={cn("w-full border-collapse text-left", minWidthClassName)}>
              {caption ? <caption className="sr-only">{caption}</caption> : null}
              <thead>
                <tr className="border-b border-border text-2xs uppercase tracking-wide text-content-subtle">
                  {visibleColumns.map((column) => {
                    const active = sort?.key === column.key;
                    return (
                      <th
                        key={column.key}
                        className={cn(
                          "px-3 py-2.5 font-medium first:pl-4 last:pr-4",
                          ALIGN[column.align ?? "left"],
                          column.headerClassName,
                        )}
                      >
                        {column.sortValue ? (
                          <button
                            type="button"
                            onClick={() => toggleSort(column)}
                            className={cn(
                              "inline-flex items-center gap-1 transition-colors hover:text-content",
                              active && "text-content",
                            )}
                          >
                            {column.header}
                            {active ? (
                              sort?.direction === "asc" ? (
                                <ArrowUp className="h-3 w-3" />
                              ) : (
                                <ArrowDown className="h-3 w-3" />
                              )
                            ) : (
                              <ChevronsUpDown className="h-3 w-3 opacity-50" />
                            )}
                          </button>
                        ) : (
                          column.header
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {paged.map((row) => (
                  <tr
                    key={getRowId(row)}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={cn(
                      "border-b border-border/60 last:border-0 hover:bg-surface-muted/40",
                      onRowClick && "cursor-pointer",
                    )}
                  >
                    {visibleColumns.map((column) => (
                      <td
                        key={column.key}
                        className={cn(
                          dense ? "px-3 py-2" : "px-3 py-3",
                          "text-sm text-content-muted first:pl-4 last:pr-4",
                          ALIGN[column.align ?? "left"],
                          column.className,
                        )}
                      >
                        {column.render(row)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {sorted.length > size ? (
            <div className="flex flex-col items-center justify-between gap-3 border-t border-border px-4 py-3 text-xs text-content-subtle sm:flex-row">
              <span>
                Showing {(safePage - 1) * size + 1}–{Math.min(safePage * size, sorted.length)} of {sorted.length}
              </span>
              <div className="flex items-center gap-2">
                <Select
                  aria-label="Rows per page"
                  value={String(size)}
                  onChange={(event) => {
                    setSize(Number(event.target.value));
                    setPage(1);
                  }}
                  className="h-8 w-[4.5rem] text-xs"
                >
                  {pageSizeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </Select>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={safePage <= 1}
                >
                  Previous
                </Button>
                <span className="tabular px-1">
                  {safePage} / {totalPages}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  disabled={safePage >= totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
