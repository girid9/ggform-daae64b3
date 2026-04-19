import * as React from "react";
import { cn } from "@/lib/utils";

interface FloatingInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

const FloatingInput = React.forwardRef<HTMLInputElement, FloatingInputProps>(
  ({ className, label, id, value, defaultValue, ...props }, ref) => {
    const [focused, setFocused] = React.useState(false);
    const hasValue = value !== undefined ? String(value).length > 0 : false;
    const isActive = focused || hasValue;
    const inputId = id || label.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="relative">
        <input
          id={inputId}
          ref={ref}
          value={value}
          className={cn(
            "peer flex h-14 w-full rounded-[24px] border border-border/70 bg-card/80 px-5 pb-3 pt-6 text-sm font-medium text-foreground shadow-[inset_0_1px_0_hsl(0_0%_100%/0.6)] ring-offset-background transition-all duration-200 placeholder:text-transparent focus-visible:border-primary focus-visible:bg-background focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
          placeholder={label}
          onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
          {...props}
        />
        <label
          htmlFor={inputId}
          className={cn(
            "pointer-events-none absolute left-5 origin-left transition-all duration-200",
            isActive
              ? "top-2.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary"
              : "top-[1.15rem] text-sm text-muted-foreground/60"
          )}
        >
          {label}
        </label>
      </div>
    );
  }
);
FloatingInput.displayName = "FloatingInput";

export { FloatingInput };
