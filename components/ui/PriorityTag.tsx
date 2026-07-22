import classNames from "classnames";

type Priority = "high" | "medium" | "low" | "urgent";

interface PriorityTagProps extends React.HTMLAttributes<HTMLDivElement> {
  priority: Priority;
}

const priorityClasses: Record<Priority, { bg: string; text: string }> = {
  high: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-300" },
  medium: { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-300" },
  low: { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-700 dark:text-green-300" },
  urgent: { bg: "bg-rose-100 dark:bg-rose-900/30", text: "text-rose-700 dark:text-rose-300" },
};

const priorityLabels: Record<Priority, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
  urgent: "Urgent",
};

export function PriorityTag({ priority, className, ...props }: PriorityTagProps) {
  const { bg, text } = priorityClasses[priority];
  return (
    <div
      className={classNames(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        bg,
        text,
        className
      )}
      {...props}
    >
      {priorityLabels[priority]}
    </div>
  );
}
