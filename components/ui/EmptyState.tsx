import { LucideIcon } from "lucide-react";
import classNames from "classnames";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  button?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  button,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={classNames(
        "flex flex-col items-center justify-center text-center py-12 px-4",
        className
      )}
    >
      {Icon && (
        <div className="mb-4 p-4 rounded-full bg-background-secondary">
          <Icon size={32} className="text-text-muted" />
        </div>
      )}
      <h3 className="text-lg font-semibold text-text mb-2">{title}</h3>
      {description && (
        <p className="text-text-secondary text-sm mb-6 max-w-sm">{description}</p>
      )}
      {button && <div>{button}</div>}
    </div>
  );
}
