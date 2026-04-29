import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Plane, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background relative overflow-hidden">
      {/* Dot grid background */}
      <div
        className="absolute inset-0 opacity-[0.04] dark:opacity-[0.06]"
        style={{
          backgroundImage: "radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      {/* Floating plane */}
      <div className="absolute top-1/4 right-1/4 animate-float opacity-10">
        <Plane className="h-32 w-32 text-primary rotate-[-20deg]" strokeWidth={0.8} />
      </div>
      <div className="absolute bottom-1/3 left-1/6 animate-float opacity-5" style={{ animationDelay: "1.5s" }}>
        <Plane className="h-20 w-20 text-accent rotate-[15deg]" strokeWidth={0.8} />
      </div>

      <div className="text-center relative z-10 px-6">
        {/* Large 404 */}
        <h1 className="text-[140px] sm:text-[180px] font-black leading-none tracking-tighter text-gradient-navy opacity-90 select-none">
          404
        </h1>

        {/* Subtitle */}
        <div className="mt-2 mb-2">
          <p className="text-2xl sm:text-3xl font-bold text-foreground">
            Lost in transit
          </p>
        </div>
        <p className="text-muted-foreground text-base sm:text-lg max-w-md mx-auto mb-8">
          The page you're looking for doesn't exist or has been moved to a different route.
        </p>

        {/* CTA */}
        <Button
          size="lg"
          className="rounded-xl h-12 px-8 font-bold shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5 gap-2"
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
