import Link from "next/link";

import { cn } from "@/lib/cn";

export function Pagination({
  currentPage,
  totalPages,
  hrefForPage,
  className,
}: {
  currentPage: number;
  totalPages: number;
  hrefForPage: (page: number) => string;
  className?: string;
}) {
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);
  const visiblePages = pages.length <= 7 ? pages : [...pages.slice(0, 3), -1, ...pages.slice(-2)];

  return (
    <nav aria-label="Pagination" className={className}>
      <ol className="flex flex-wrap items-center gap-2">
        <li>
          <Link
            href={hrefForPage(Math.max(1, currentPage - 1))}
            aria-disabled={currentPage === 1}
            className={cn(
              "inline-flex px-2 py-1 font-bold underline decoration-2 underline-offset-2",
              currentPage === 1 && "pointer-events-none text-scouts-muted",
            )}
          >
            Previous
          </Link>
        </li>
        {visiblePages.map((page, index) => (
          <li key={`${page}-${index}`}>
            {page === -1 ? (
              <span className="px-1 text-scouts-muted" aria-hidden>
                ...
              </span>
            ) : (
              <Link
                href={hrefForPage(page)}
                aria-current={page === currentPage ? "page" : undefined}
                className={cn(
                  "inline-flex min-w-8 justify-center border-2 px-2 py-1 font-bold",
                  page === currentPage
                    ? "border-scouts-primary bg-scouts-primary text-scouts-primary-foreground"
                    : "border-transparent text-scouts-link underline decoration-2 underline-offset-2 hover:border-scouts-primary-light",
                )}
              >
                <span className="sr-only">Page </span>
                {page}
              </Link>
            )}
          </li>
        ))}
        <li>
          <Link
            href={hrefForPage(Math.min(totalPages, currentPage + 1))}
            aria-disabled={currentPage === totalPages}
            className={cn(
              "inline-flex px-2 py-1 font-bold underline decoration-2 underline-offset-2",
              currentPage === totalPages && "pointer-events-none text-scouts-muted",
            )}
          >
            Next
          </Link>
        </li>
      </ol>
    </nav>
  );
}
