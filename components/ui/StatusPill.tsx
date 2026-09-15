import classNames from "classnames";

type Status =
  | "open"
  | "pending"
  | "completed"
  | "assigned"
  | "rejected"
  | "accepted";

interface StatusPillProps extends React.HTMLAttributes<HTMLDivElement> {
  status: Status;
}

const statusClasses: Record<Status, { bg: string; text: string }> = {
  open: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-300" },
  pending: { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-300" },
  completed: { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-700 dark:text-green-300" },
  assigned: { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-700 dark:text-purple-300" },
  rejected: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-300" },
  accepted: { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-300" },
};

const statusLabels: Record<Status, string> = {
  open: "Open",
  pending: "Pending",
  completed: "Completed",
  assigned: "Assigned",
  rejected: "Rejected",
  accepted: "Accepted",
};

export function StatusPill({ status, className, ...props }: StatusPillProps) {
  const { bg, text } = statusClasses[status];
  return (
    <div
      className={classNames(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
        bg,
        text,
        className
      )}
      {...props}
    >
      <span className="mr-1.5 inline-block w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {statusLabels[status]}
    </div>
  );
}
