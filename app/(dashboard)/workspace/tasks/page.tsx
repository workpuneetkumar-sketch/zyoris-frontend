// app/(dashboard)/workspace/tasks/page.tsx
"use client";

import { TasksPageContent } from "@/components/tasks/TasksPageContent";

export default function WorkspaceTasksPage() {
  return <TasksPageContent defaultTab="my" />;
}
