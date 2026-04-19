import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="page-bg flex min-h-screen items-center justify-center px-4 py-8">
      <div className="hero-shell w-full max-w-2xl p-8 text-center sm:p-10">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] bg-primary/10 text-primary">
          <Compass className="h-10 w-10" />
        </div>
        <p className="eyebrow mt-6">404</p>
        <h1 className="mt-3 text-4xl font-extrabold sm:text-5xl">This page drifted off course.</h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">
          The route <span className="font-semibold text-foreground">{location.pathname}</span> does
          not exist in this app right now.
        </p>
        <Button asChild className="btn-primary mt-8 h-12 px-5 text-sm">
          <Link to="/">
            <ArrowLeft className="h-4 w-4" />
            Return to dashboard
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
