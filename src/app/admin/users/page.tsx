import Link from "next/link";

import { UsersTable } from "@/components/admin/users-table";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui/card";
import { fieldClasses } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import { listRecentUsers, searchUsers } from "@/server/domain/users";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function pageHref(query: string, page: number) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (page > 1) params.set("page", String(page));
  const search = params.toString();

  return search ? `/admin/users?${search}` : "/admin/users";
}

export default async function UsersPage({ searchParams }: PageProps<"/admin/users">) {
  const params = await searchParams;
  const query = first(params.q) ?? "";
  const requestedPage = Number.parseInt(first(params.page) ?? "1", 10) || 1;

  const [recent, result] = await Promise.all([
    listRecentUsers(),
    searchUsers({ query, page: requestedPage }),
  ]);

  const from = result.total === 0 ? 0 : (result.page - 1) * result.pageSize + 1;
  const to = Math.min(result.page * result.pageSize, result.total);
  const linkClasses =
    "inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50";
  const disabledLinkClasses = "pointer-events-none opacity-40";

  return (
    <div className="space-y-6">
      <PageHeader title="Users" description="Players and administrator accounts." />

      <Card>
        <CardHeader title="Recent sign-ups" description="The 10 most recent accounts." />
        <CardBody>
          <UsersTable users={recent} emptyMessage="No one has signed up yet." />
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="All users"
          description={
            result.total === 0
              ? "No users match."
              : `Showing ${from}–${to} of ${result.total}${result.query ? ` matching “${result.query}”` : ""}.`
          }
        />
        <CardBody className="space-y-4">
          <form method="get" action="/admin/users" className="flex gap-2">
            <label htmlFor="users-search" className="sr-only">
              Search users
            </label>
            <input
              id="users-search"
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Search by name or email"
              className={cn(fieldClasses, "max-w-sm")}
            />
            <button
              type="submit"
              className="rounded-md bg-slate-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              Search
            </button>
            {query ? (
              <Link href="/admin/users" className={linkClasses}>
                Clear
              </Link>
            ) : null}
          </form>

          <UsersTable
            users={result.users}
            emptyMessage={query ? "No users match that search." : "No users yet."}
          />

          {result.pageCount > 1 ? (
            <nav className="flex items-center justify-between text-sm text-slate-600" aria-label="Pagination">
              <Link
                href={pageHref(result.query, result.page - 1)}
                className={cn(linkClasses, result.page <= 1 && disabledLinkClasses)}
                aria-disabled={result.page <= 1}
              >
                ← Previous
              </Link>
              <span>
                Page {result.page} of {result.pageCount}
              </span>
              <Link
                href={pageHref(result.query, result.page + 1)}
                className={cn(linkClasses, result.page >= result.pageCount && disabledLinkClasses)}
                aria-disabled={result.page >= result.pageCount}
              >
                Next →
              </Link>
            </nav>
          ) : null}
        </CardBody>
      </Card>
    </div>
  );
}
