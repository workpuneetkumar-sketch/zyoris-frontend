import classNames from "classnames";

type SkeletonVariant = "card" | "table" | "notification" | "text" | "circle";

interface SkeletonProps {
  variant?: SkeletonVariant;
  className?: string;
  count?: number;
}

export function Skeleton({ variant = "text", className, count = 1 }: SkeletonProps) {
  const renderVariant = () => {
    switch (variant) {
      case "card":
        return (
          <div className="space-y-3">
            <div className="h-40 bg-background-tertiary rounded-xl animate-pulse" />
            <div className="h-4 bg-background-tertiary rounded w-3/4 animate-pulse" />
            <div className="h-4 bg-background-tertiary rounded w-1/2 animate-pulse" />
          </div>
        );
      case "table":
        return (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <div className="h-4 bg-background-tertiary rounded w-1/4 animate-pulse" />
                <div className="h-4 bg-background-tertiary rounded w-1/3 animate-pulse" />
                <div className="h-4 bg-background-tertiary rounded w-1/4 animate-pulse" />
              </div>
            ))}
          </div>
        );
      case "notification":
        return (
          <div className="flex gap-3">
            <div className="w-10 h-10 bg-background-tertiary rounded-full shrink-0 animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-background-tertiary rounded w-3/4 animate-pulse" />
              <div className="h-3 bg-background-tertiary rounded w-1/2 animate-pulse" />
            </div>
          </div>
        );
      case "circle":
        return <div className="w-10 h-10 bg-background-tertiary rounded-full animate-pulse" />;
      default:
        return <div className="h-4 bg-background-tertiary rounded w-full animate-pulse" />;
    }
  };

  return (
    <div className={classNames("space-y-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i}>{renderVariant()}</div>
      ))}
    </div>
  );
}
