import Link from "next/link";

function buildHref(pathname: string, query: Record<string, string | undefined>, page: number, pageParam = "page") {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === "") continue;
    if (key === pageParam) continue;
    params.set(key, value);
  }
  if (page > 1) params.set(pageParam, String(page));
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

function pageWindow(current: number, totalPages: number): number[] {
  if (totalPages <= 0) return [];
  const width = 5;
  let start = Math.max(1, current - Math.floor(width / 2));
  const end = Math.min(totalPages, start + width - 1);
  start = Math.max(1, end - width + 1);
  const out: number[] = [];
  for (let p = start; p <= end; p++) out.push(p);
  return out;
}

export function PaginationBar(props: {
  pathname: string;
  query: Record<string, string | undefined>;
  page: number;
  pageSize: number;
  total: number;
  pageParam?: string;
}) {
  const { pathname, query, page, pageSize, total, pageParam = "page" } = props;
  const totalPages = total === 0 ? 1 : Math.ceil(total / pageSize);
  const safePage = Math.min(Math.max(1, page), totalPages);
  const from = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = Math.min(safePage * pageSize, total);
  const pages = pageWindow(safePage, totalPages);

  return (
    <div className="flex flex-col gap-3 border-t border-zinc-200 px-4 py-3 text-sm text-zinc-600 sm:flex-row sm:items-center sm:justify-between">
      <p>
        Mostrando <span className="font-medium text-zinc-900">{from}</span> a{" "}
        <span className="font-medium text-zinc-900">{to}</span> de{" "}
        <span className="font-medium text-zinc-900">{total}</span> registros
      </p>
      <nav className="flex flex-wrap items-center gap-2" aria-label="Paginacion">
        {safePage > 1 ? (
          <Link
            href={buildHref(pathname, query, safePage - 1, pageParam)}
            className="text-lm-aqua hover:underline"
          >
            Anterior
          </Link>
        ) : (
          <span className="text-zinc-400">Anterior</span>
        )}
        <div className="flex flex-wrap items-center gap-1">
          {pages.map((p) => (
            <Link
              key={p}
              href={buildHref(pathname, query, p, pageParam)}
              className={`inline-flex min-w-[2rem] items-center justify-center rounded border px-2 py-1 text-xs font-medium ${
                p === safePage ? "border-zinc-400 bg-zinc-100 text-zinc-900" : "border-transparent text-zinc-600 hover:bg-zinc-50"
              }`}
            >
              {p}
            </Link>
          ))}
          {totalPages > pages[pages.length - 1]! ? (
            <span className="px-1 text-zinc-400" aria-hidden>
              …
            </span>
          ) : null}
          {totalPages > (pages[pages.length - 1] ?? 0) && !pages.includes(totalPages) ? (
            <Link
              href={buildHref(pathname, query, totalPages, pageParam)}
              className="inline-flex min-w-[2rem] items-center justify-center rounded border border-transparent px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
            >
              {totalPages}
            </Link>
          ) : null}
        </div>
        {safePage < totalPages ? (
          <Link
            href={buildHref(pathname, query, safePage + 1, pageParam)}
            className="text-lm-aqua hover:underline"
          >
            Siguiente
          </Link>
        ) : (
          <span className="text-zinc-400">Siguiente</span>
        )}
      </nav>
    </div>
  );
}
