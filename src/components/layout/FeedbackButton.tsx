import { useState } from "react";
import { useLocation } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { MessageSquarePlus } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea, Select } from "@/components/ui/input";
import { submitFeedback } from "@/lib/feedback.functions";

type Category = "bug" | "suggestion" | "other";

const CATEGORY_LABELS: Record<Category, string> = {
  bug: "Bugg",
  suggestion: "Förslag",
  other: "Annat",
};

function detectOs(): string {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent;
  if (/Windows/i.test(ua)) return "Windows";
  if (/Mac OS X|Macintosh/i.test(ua)) return "macOS";
  if (/Android/i.test(ua)) return "Android";
  if (/iPhone|iPad|iPod/i.test(ua)) return "iOS";
  if (/Linux/i.test(ua)) return "Linux";
  return "unknown";
}

function detectDevice(): string {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent;
  if (/iPad|Tablet/i.test(ua)) return "tablet";
  if (/Mobi|iPhone|Android.*Mobile/i.test(ua)) return "mobile";
  return "desktop";
}

export function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState<Category>("suggestion");
  const location = useLocation();
  const submitFn = useServerFn(submitFeedback);

  const mutation = useMutation({
    mutationFn: (input: { message: string; category: Category; page_url: string; os: string; device: string }) =>
      submitFn({ data: input }),
    onSuccess: () => {
      toast.success("Tack! Din feedback är skickad.");
      setMessage("");
      setCategory("suggestion");
      setOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Kunde inte skicka feedback. Försök igen om en stund.");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) return;
    mutation.mutate({
      message: trimmed,
      category,
      page_url: location.pathname,
      os: detectOs(),
      device: detectDevice(),
    });
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
          Berätta vad som funkar bra eller mindre bra – vi läser allt.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="feedback-category">Kategori</Label>
            <Select
              id="feedback-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
            >
              {(Object.entries(CATEGORY_LABELS) as [Category, string][]).map(([value, label]) => (
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
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={mutation.isPending}>
              Avbryt
            </Button>
            <Button type="submit" disabled={mutation.isPending || !message.trim()}>
              {mutation.isPending ? "Skickar…" : "Skicka"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
