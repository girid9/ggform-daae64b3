import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";

interface SuccessScreenProps {
  title?: string;
  subtitle?: string;
  children?: React.ReactNode;
}

const AnimatedCheckmark = () => {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <svg
      className="w-20 h-20 mx-auto"
      viewBox="0 0 80 80"
      fill="none"
    >
      <circle
        cx="40"
        cy="40"
        r="36"
        stroke="hsl(var(--success))"
        strokeWidth="3"
        strokeLinecap="round"
        className="transition-all duration-700"
        style={{
          strokeDasharray: 226,
          strokeDashoffset: visible ? 0 : 226,
        }}
      />
      <path
        d="M24 42 L34 52 L56 30"
        stroke="hsl(var(--success))"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="transition-all duration-500 delay-500"
        style={{
          strokeDasharray: 50,
          strokeDashoffset: visible ? 0 : 50,
        }}
      />
    </svg>
  );
};

const SuccessScreen = ({ title = "Thank you!", subtitle, children }: SuccessScreenProps) => {
  return (
    <div className="flex min-h-screen items-center justify-center px-5 bg-gradient-to-br from-violet-50 via-white to-purple-50 dark:from-background dark:via-background dark:to-background">
      <Card className="w-full max-w-sm glass-card animate-scale-in text-center">
        <CardContent className="py-10">
          <AnimatedCheckmark />
          <h1 className="text-2xl font-bold mt-6 mb-1">{title}</h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
          {children && <div className="mt-6">{children}</div>}
        </CardContent>
      </Card>
    </div>
  );
};

export { SuccessScreen };
