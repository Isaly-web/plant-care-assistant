import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { listMyFeedback, type FeedbackListItem } from "@/lib/feedback.functions";
import { formatFullDate } from "@/lib/date";

export const Route = createFileRoute("/_authenticated/feedback")({
  head: () => ({ meta: [{ title: "Min feedback – Plant Care Assistant" }] }),
  component: FeedbackListPage,
});

const STATUS_LABELS: Record<string, string> = {
  new: "Ny",
  reviewed: "Granskad",
  resolved: "Löst",
  archived: "Arkiverad",
};

const CATEGORY_LABELS: Record<string, string> = {
  bug: "Bugg",
  suggestion: "Förslag",
  other: "Annat",
};

function truncate(text: string, max = 140): string {
  return text.length <= max ? text : `${text.slice(0, max).trimEnd()}…`;
}

function FeedbackListPage() {
  const router = useRouter();
  const listFn = useServerFn(listMyFeedback);
  const { data, isLoading, isError, refetch, isFetching } = useQuery<FeedbackListItem[]>({
    queryKey: ["feedback", "mine"],
    queryFn: () => listFn(),
    retry: 1,
  });

  return (
    <div className="space-y-4 pb-8">
      <button
        onClick={() => router.history.back()}
        className="-ml-2 flex items-center gap-1 rounded-full px-2 py-1 text-sm text-[var(--color-ink-muted)]"
      >
        <ChevronLeft className="h-4 w-4" /> Tillbaka
      </button>
      <PageHeader title="Min feedback" subtitle="Ärenden du skickat in och svar från oss" />

      {isLoading && (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-[var(--color-ink-muted)]">
          <Spinner /> Laddar…
        </div>
      )}

      {isError && (
        <Card className="space-y-3 p-5 text-center">
          <p className="text-sm text-[var(--color-ink-muted)]">
            Kunde inte hämta din feedback just nu. Försök igen om en stund.
          </p>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? "Försöker…" : "Försök igen"}
          </Button>
        </Card>
      )}

      {!isLoading && !isError && (data ?? []).length === 0 && (
        <EmptyState
          emoji="💬"
          title="Ingen feedback än"
          description="Använd feedback-knappen längst ner till höger för att komma igång."
        />
      )}

      <div className="space-y-2">
        {data?.map((item) => (
          <Link key={item.id} to="/feedback/$id" params={{ id: item.id }}>
            <Card className="flex items-center gap-3 p-4 transition hover:bg-[var(--color-surface-muted)]">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-ink-muted)]">
                  <span className="rounded-full bg-[var(--color-surface-muted)] px-2 py-0.5">
                    {STATUS_LABELS[item.status ?? "new"] ?? item.status ?? "Ny"}
                  </span>
                  <span className="rounded-full bg-[var(--color-surface-muted)] px-2 py-0.5">
                    {CATEGORY_LABELS[item.category ?? ""] ?? item.category ?? "Annat"}
                  </span>
                  <span>{formatFullDate(item.created_at)}</span>
                </div>
                <p className="mt-2 truncate text-sm text-[var(--color-ink)]">{truncate(item.message)}</p>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-[var(--color-ink-muted)]" />
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
