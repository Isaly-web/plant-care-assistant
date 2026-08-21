import { useState } from "react";
import { useLocation } from "react-router-dom";
import { MessageSquarePlus } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea, Select } from "@/components/ui/input";
import { useSubmitFeedback } from "@/hooks/mutations";
import type { FeedbackCategory } from "@/services/feedbackService";

const CATEGORY_LABELS: Record<FeedbackCategory, string> = {
  bug: "Bugg",
  suggestion: "Förslag",
  other: "Annat",
};

export function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState<FeedbackCategory>("suggestion");
  const location = useLocation();
  const submitFeedback = useSubmitFeedback();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) return;
    submitFeedback.mutate(
      { message: trimmed, category },
      {
        onSuccess: () => {
          setMessage("");
          setCategory("suggestion");
          setOpen(false);
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ge feedback"
        className="fixed bottom-24 right-4 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary)]/30 transition-transform active:scale-95"
      >
        <MessageSquarePlus className="h-5 w-5" />
      </button>

      <DialogContent>
        <DialogTitle>Ge feedback</DialogTitle>
        <p className="-mt-2 mb-4 text-sm text-[var(--color-ink-muted)]">
          Berätta vad som funkar bra eller mindre bra – vi läser allt. Sidan du är på ({location.pathname}) skickas
          med automatiskt.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="feedback-category">Kategori</Label>
            <Select
              id="feedback-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as FeedbackCategory)}
            >
              {(Object.entries(CATEGORY_LABELS) as [FeedbackCategory, string][]).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="feedback-message">Meddelande</Label>
            <Textarea
              id="feedback-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Vad vill du berätta för oss?"
              rows={5}
              maxLength={4000}
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={submitFeedback.isPending}
            >
              Avbryt
            </Button>
            <Button type="submit" disabled={submitFeedback.isPending || !message.trim()}>
              {submitFeedback.isPending ? "Skickar…" : "Skicka"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
