import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const fieldClasses =
  "w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-base text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => <input ref={ref} className={cn(fieldClasses, className)} {...props} />,
);
Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={cn(fieldClasses, "min-h-24 resize-y", className)} {...props} />
  ),
);
Textarea.displayName = "Textarea";

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select ref={ref} className={cn(fieldClasses, "appearance-none bg-no-repeat pr-10", className)} {...props}>
      {children}
    </select>
  ),
);
Select.displayName = "Select";
