import classNames from "classnames";

type BadgeVariant = "success" | "warning" | "error" | "info" | "neutral";

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  success: "bg-success-light text-success-foreground",
  warning: "bg-warning-light text-warning-foreground",
  error: "bg-error-light text-error-foreground",
  info: "bg-info-light text-info-foreground",
  neutral: "bg-background-secondary text-text-secondary",
};

export function Badge({ className, variant = "neutral", ...props }: BadgeProps) {
  return (
    <div
      className={classNames(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
}
