import * as LabelPrimitive from "@radix-ui/react-label";
import { cn } from "@/lib/utils";

export function Label({ className, ...props }: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      className={cn("mb-1.5 block text-sm font-medium text-[var(--color-ink)]", className)}
      {...props}
    />
  );
}
