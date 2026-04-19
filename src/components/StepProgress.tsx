import { cn } from "@/lib/utils";

interface StepProgressProps {
  currentStep: number;
  totalSteps: number;
  labels?: string[];
}

const StepProgress = ({ currentStep, totalSteps, labels }: StepProgressProps) => {
  return (
    <div className="w-full mb-6">
      <div className="flex items-center gap-2">
        {Array.from({ length: totalSteps }).map((_, i) => {
          const stepNum = i + 1;
          const isCompleted = stepNum < currentStep;
          const isCurrent = stepNum === currentStep;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
              <div className="flex items-center w-full gap-1">
                <div
                  className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 shrink-0",
                    isCompleted
                      ? "bg-primary text-primary-foreground"
                      : isCurrent
                      ? "bg-primary text-primary-foreground ring-4 ring-primary/10"
                      : "bg-secondary text-muted-foreground"
                  )}
                >
                  {stepNum}
                </div>
                {i < totalSteps - 1 && (
                  <div className={cn(
                    "h-0.5 flex-1 rounded-full transition-all duration-300",
                    isCompleted ? "bg-primary" : "bg-border"
                  )} />
                )}
              </div>
              {labels && labels[i] && (
                <span
                  className={cn(
                    "text-[10px] transition-colors",
                    isCompleted || isCurrent
                      ? "text-primary font-medium"
                      : "text-muted-foreground/40"
                  )}
                >
                  {labels[i]}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export { StepProgress };
