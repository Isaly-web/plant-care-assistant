import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

export const Tabs = TabsPrimitive.Root;

export function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn("flex gap-1 overflow-x-auto no-scrollbar rounded-full bg-[var(--color-surface-muted)] p-1", className)}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "shrink-0 rounded-full px-4 py-2 text-sm font-medium text-[var(--color-ink-muted)] transition-colors data-[state=active]:bg-[var(--color-surface)] data-[state=active]:text-[var(--color-ink)] data-[state=active]:shadow-sm",
        className,
      )}
      {...props}
    />
  );
}

export const TabsContent = TabsPrimitive.Content;
