import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, MessageSquare } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { getMyFeedback, type FeedbackDetail } from "@/lib/feedback.functions";
import { formatFullDate } from "@/lib/date";

export const Route = createFileRoute("/_authenticated/feedback/$id")({
  head: () => ({ meta: [{ title: "Feedback-ärende – Plant Care Assistant" }] }),
  component: FeedbackDetailPage,
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

function FeedbackDetailPage() {
  const { id } = Route.useParams();
  const router = useRouter();
  const getFn = useServerFn(getMyFeedback);
  const { data, isLoading, isError, refetch, isFetching } = useQuery<FeedbackDetail>({
    queryKey: ["feedback", "detail", id],
    queryFn: () => getFn({ data: { id } }),
    retry: 1,
  });

  return (
    <div className="space-y-4 pb-8">
      <button
        onClick={() => router.history.back()}
        className="-ml-2 flex items-center gap-1 rounded-full px-2 py-1 text-sm text-[var(--color-ink-muted)]"
      >
        <ChevronLeft className="h-4 w-4" /> Min feedback
      </button>
      <h1 className="font-display text-2xl font-semibold text-[var(--color-ink)]">Ditt ärende</h1>

      {isLoading && (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-[var(--color-ink-muted)]">
          <Spinner /> Laddar…
        </div>
      )}

      {isError && (
        <Card className="space-y-3 p-5 text-center">
          <p className="text-sm text-[var(--color-ink-muted)]">Kunde inte hämta ärendet just nu.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? "Försöker…" : "Försök igen"}
          </Button>
        </Card>
      )}

      {data && (
        <>
          <Card className="space-y-3 p-5">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-ink-muted)]">
              <span className="rounded-full bg-[var(--color-surface-muted)] px-2 py-0.5">
                {STATUS_LABELS[data.status ?? "new"] ?? data.status ?? "Ny"}
              </span>
              <span className="rounded-full bg-[var(--color-surface-muted)] px-2 py-0.5">
                {CATEGORY_LABELS[data.category ?? ""] ?? data.category ?? "Annat"}
              </span>
              <span className="ml-auto">{formatFullDate(data.created_at)}</span>
            </div>
            <p className="whitespace-pre-wrap text-sm text-[var(--color-ink)]">{data.message}</p>
          </Card>

          <div>
            <p className="mb-2 text-sm font-semibold text-[var(--color-ink)]">Konversation</p>
            {data.replies.length === 0 ? (
              <EmptyState emoji="💬" title="Inget svar än" description="Vi återkommer så snart vi kan." />
            ) : (
              <div className="space-y-2">
                {data.replies.map((reply) => (
                  <Card key={reply.id} className="p-4">
                    <p className="flex items-center gap-1.5 text-xs text-[var(--color-ink-muted)]">
                      <MessageSquare className="h-3 w-3" /> Svar · {formatFullDate(reply.created_at)}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--color-ink)]">{reply.message}</p>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
