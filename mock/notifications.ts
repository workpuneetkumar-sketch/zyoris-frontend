import type { Notification } from "@/types/notifications";

export const mockNotifications: Notification[] = [
  {
    id: "1",
    title: "Lead Assigned",
    message: "You have been assigned a new lead: John Doe from Acme Corp.",
    type: "lead_assigned",
    priority: "high",
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 minutes ago
    read: false,
    deepLink: "/leads/1",
    actor: {
      id: "u1",
      name: "Sarah Johnson",
      avatarUrl: "https://i.pravatar.cc/150?img=1",
    },
  },
  {
    id: "2",
    title: "Lead Shared",
    message: "Michael Chen shared a lead with you: Tech Solutions Inc.",
    type: "lead_shared",
    priority: "medium",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    read: false,
    deepLink: "/leads/2",
    actor: {
      id: "u2",
      name: "Michael Chen",
      avatarUrl: "https://i.pravatar.cc/150?img=2",
    },
  },
  {
    id: "3",
    title: "Task Assigned",
    message: "New task assigned: Follow up with Jane Smith about the proposal.",
    type: "task_assigned",
    priority: "urgent",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    read: true,
    deepLink: "/tasks/1",
    actor: {
      id: "u3",
      name: "David Wilson",
      avatarUrl: "https://i.pravatar.cc/150?img=3",
    },
  },
  {
    id: "4",
    title: "Mentioned in Comment",
    message: "Emily Davis mentioned you in a comment on Lead #456.",
    type: "mention",
    priority: "medium",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), // 2 days ago
    read: true,
    deepLink: "/leads/456",
    actor: {
      id: "u4",
      name: "Emily Davis",
      avatarUrl: "https://i.pravatar.cc/150?img=4",
    },
  },
  {
    id: "5",
    title: "System Reminder",
    message: "Don't forget to update your weekly report by EOD.",
    type: "system_reminder",
    priority: "low",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(), // 3 days ago
    read: true,
    deepLink: "/dashboard",
  },
  {
    id: "6",
    title: "Sync Complete",
    message: "Your contacts have been successfully synced with Outlook.",
    type: "success",
    priority: "low",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString(), // 4 days ago
    read: true,
  },
  {
    id: "7",
    title: "Payment Failed",
    message: "Invoice #789 payment failed. Please update your payment method.",
    type: "error",
    priority: "high",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(), // 5 days ago
    read: false,
    deepLink: "/payment/invoices/789",
  },
  {
    id: "8",
    title: "Rate Limit Warning",
    message: "You are approaching the API rate limit. Please reduce your request frequency.",
    type: "warning",
    priority: "medium",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toISOString(), // 6 days ago
    read: true,
  },
  {
    id: "9",
    title: "Lead Assigned",
    message: "New lead: Robert Taylor from Global Enterprises.",
    type: "lead_assigned",
    priority: "high",
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
    read: false,
    deepLink: "/leads/9",
    actor: {
      id: "u5",
      name: "Lisa Anderson",
      avatarUrl: "https://i.pravatar.cc/150?img=5",
    },
  },
  {
    id: "10",
    title: "Task Completed",
    message: "Task 'Send contract to client' has been marked as completed.",
    type: "success",
    priority: "medium",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), // 3 hours ago
    read: true,
    deepLink: "/tasks/2",
  },
  {
    id: "11",
    title: "New Message",
    message: "You have a new message from Kevin Lee.",
    type: "mention",
    priority: "medium",
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 minutes ago
    read: false,
    deepLink: "/messages/11",
    actor: {
      id: "u6",
      name: "Kevin Lee",
      avatarUrl: "https://i.pravatar.cc/150?img=6",
    },
  },
  {
    id: "12",
    title: "Meeting Reminder",
    message: "Reminder: Team sync meeting starts in 30 minutes.",
    type: "system_reminder",
    priority: "urgent",
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 minutes ago
    read: false,
    deepLink: "/calendar",
  },
  {
    id: "13",
    title: "Deal Closed",
    message: "Deal #123 has been closed successfully! Congratulations!",
    type: "success",
    priority: "high",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(), // ~1 day 2 hours ago
    read: true,
    deepLink: "/deals/123",
    actor: {
      id: "u7",
      name: "Alex Martinez",
      avatarUrl: "https://i.pravatar.cc/150?img=7",
    },
  },
  {
    id: "14",
    title: "Document Shared",
    message: "Jessica Wong shared a document with you: Q4 Budget Proposal.",
    type: "lead_shared",
    priority: "low",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(), // 1 week ago
    read: true,
    deepLink: "/documents/14",
    actor: {
      id: "u8",
      name: "Jessica Wong",
      avatarUrl: "https://i.pravatar.cc/150?img=8",
    },
  },
  {
    id: "15",
    title: "Report Generated",
    message: "Your monthly sales report is ready for download.",
    type: "success",
    priority: "medium",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8).toISOString(), // 8 days ago
    read: true,
    deepLink: "/reports",
  },
  {
    id: "16",
    title: "Login Alert",
    message: "New login detected from Chrome on Windows.",
    type: "warning",
    priority: "high",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 9).toISOString(), // 9 days ago
    read: true,
  },
  {
    id: "17",
    title: "Lead Updated",
    message: "Lead #567 has been updated with new contact information.",
    type: "lead_assigned",
    priority: "medium",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(), // 10 days ago
    read: true,
    deepLink: "/leads/567",
    actor: {
      id: "u9",
      name: "Ryan Thompson",
      avatarUrl: "https://i.pravatar.cc/150?img=9",
    },
  },
  {
    id: "18",
    title: "Task Overdue",
    message: "Task 'Review proposal' is now overdue.",
    type: "error",
    priority: "urgent",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 11).toISOString(), // 11 days ago
    read: false,
    deepLink: "/tasks/3",
  },
  {
    id: "19",
    title: "New Lead",
    message: "A new lead has been added: Amanda Green from Innovate Co.",
    type: "lead_assigned",
    priority: "high",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12).toISOString(), // 12 days ago
    read: true,
    deepLink: "/leads/19",
  },
  {
    id: "20",
    title: "Invitation Accepted",
    message: "Chris Brown has accepted your invitation to join the workspace.",
    type: "success",
    priority: "low",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 13).toISOString(), // 13 days ago
    read: true,
    deepLink: "/team",
    actor: {
      id: "u10",
      name: "Chris Brown",
      avatarUrl: "https://i.pravatar.cc/150?img=10",
    },
  },
  {
    id: "21",
    title: "File Uploaded",
    message: "New file uploaded: Presentation_v2.pptx",
    type: "system_reminder",
    priority: "low",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(), // 14 days ago
    read: true,
    deepLink: "/documents/21",
  },
  {
    id: "22",
    title: "Integration Status",
    message: "Slack integration has been reconnected successfully.",
    type: "success",
    priority: "medium",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15).toISOString(), // 15 days ago
    read: true,
  },
  {
    id: "23",
    title: "Permission Changed",
    message: "Your permissions have been updated by an admin.",
    type: "warning",
    priority: "medium",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 16).toISOString(), // 16 days ago
    read: true,
    deepLink: "/settings",
  },
  {
    id: "24",
    title: "Comment Added",
    message: "New comment on your deal: 'Need to adjust pricing'",
    type: "mention",
    priority: "medium",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 17).toISOString(), // 17 days ago
    read: true,
    deepLink: "/deals/24",
    actor: {
      id: "u11",
      name: "Nina Patel",
      avatarUrl: "https://i.pravatar.cc/150?img=11",
    },
  },
  {
    id: "25",
    title: "Subscription Expiring",
    message: "Your subscription will expire in 7 days. Please renew to avoid service interruption.",
    type: "warning",
    priority: "urgent",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 18).toISOString(), // 18 days ago
    read: false,
    deepLink: "/settings/billing",
  },
];
