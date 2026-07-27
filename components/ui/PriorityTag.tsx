import classNames from "classnames";

type Priority = "critical" | "high" | "medium" | "low" | "urgent";

interface PriorityTagProps extends React.HTMLAttributes<HTMLDivElement> {
  priority?: Priority | string; // ⭐ Allow string to handle unknown values
}

const priorityClasses: Record<Priority, { bg: string; text: string }> = {
  critical: { bg: "bg-red-200 dark:bg-red-900/50", text: "text-red-800 dark:text-red-300" },
  high: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-300" },
  medium: { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-300" },
  low: { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-700 dark:text-green-300" },
  urgent: { bg: "bg-rose-100 dark:bg-rose-900/30", text: "text-rose-700 dark:text-rose-300" },
};

const priorityLabels: Record<Priority, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
  urgent: "Urgent",
};

// ⭐ DEFAULT priority when unknown
const DEFAULT_PRIORITY: Priority = "medium";

export function PriorityTag({ priority, className, ...props }: PriorityTagProps) {
  // ⭐ FIX: Check if priority exists in priorityClasses, otherwise use default
  const isValidPriority = priority && priority in priorityClasses;
  const validPriority = isValidPriority ? (priority as Priority) : DEFAULT_PRIORITY;
  
  const { bg, text } = priorityClasses[validPriority];
  
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
      {priorityLabels[validPriority]}
    </div>
  );
}