import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon?: "quiz" | "students" | "chart";
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

const illustrations: Record<string, React.ReactNode> = {
  quiz: (
    <svg className="w-16 h-16 text-muted-foreground/20" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="10" y="6" width="44" height="52" rx="4" />
      <line x1="20" y1="18" x2="44" y2="18" />
      <line x1="20" y1="26" x2="38" y2="26" />
      <line x1="20" y1="34" x2="42" y2="34" />
      <circle cx="20" cy="44" r="2" fill="currentColor" />
      <circle cx="28" cy="44" r="2" fill="currentColor" />
      <circle cx="36" cy="44" r="2" fill="currentColor" />
    </svg>
  ),
  students: (
    <svg className="w-16 h-16 text-muted-foreground/20" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="32" cy="20" r="8" />
      <path d="M16 52c0-8.8 7.2-16 16-16s16 7.2 16 16" />
      <circle cx="48" cy="18" r="5" />
      <path d="M52 48c0-5-3-9-7-11" />
    </svg>
  ),
  chart: (
    <svg className="w-16 h-16 text-muted-foreground/20" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="8" y="36" width="10" height="20" rx="2" />
      <rect x="22" y="24" width="10" height="32" rx="2" />
      <rect x="36" y="16" width="10" height="40" rx="2" />
      <rect x="50" y="8" width="10" height="48" rx="2" />
    </svg>
  ),
};

const EmptyState = ({ icon = "quiz", title, description, actionLabel, onAction }: EmptyStateProps) => {
  return (
    <div className="animate-fade-up flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-[28px] border border-border/70 bg-background/80 p-5 shadow-[0_24px_50px_-38px_hsl(var(--foreground)/0.38)]">
        {illustrations[icon]}
      </div>
      <h3 className="mt-5 text-lg font-bold">{title}</h3>
      {description && (
        <p className="mt-2 max-w-[260px] text-sm leading-6 text-muted-foreground">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button size="sm" className="btn-primary mt-5 gap-1.5 rounded-2xl px-4" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

export { EmptyState };
