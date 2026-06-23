// lib/chatDataService.ts
import api from "./api/api";

// ─── Detect Intent from User Question ──────────────────────────

export function detectIntent(question: string): string {
  const text = question.toLowerCase();
  
  const intentMap: Record<string, string[]> = {
    'leads': ['lead', 'leads', 'prospect'],
    'deals': ['deal', 'deals', 'pipeline', 'won', 'lost'],
    'contacts': ['contact', 'contacts', 'person'],
    'companies': ['company', 'companies', 'organization'],
    'revenue': ['revenue', 'forecast', 'financial', 'money', 'income'],
    'segments': ['segment', 'segments', 'cluster', 'customer'],
    'conversion': ['conversion', 'probability', 'win rate'],
    'recommendations': ['recommend', 'recommendation', 'suggestion', 'advice'],
    'expenses': ['expense', 'expenses', 'cost', 'spend', 'budget'],
    'invoices': ['invoice', 'invoices', 'bill'],
    'employees': ['employee', 'employees', 'staff', 'team member', 'people'],
    'attendance': ['attendance', 'present', 'absent'],
    'leaves': ['leave', 'leaves', 'holiday', 'time off'],
    'campaigns': ['campaign', 'campaigns', 'marketing'],
    'projects': ['project', 'projects'],
    'tasks': ['task', 'tasks', 'todo'],
    'documents': ['document', 'documents', 'file'],
    'activities': ['activity', 'activities', 'action'],
    'calls': ['call', 'calls', 'phone'],
    'emails': ['email', 'emails', 'mail'],
    'messages': ['message', 'messages', 'chat'],
    'hr': ['hr', 'human resources', 'employee', 'attendance', 'leave'],
    'finance': ['finance', 'expense', 'invoice', 'budget'],
    'overview': ['overview', 'summary', 'dashboard', 'snapshot'],
  };
  
  for (const [intent, keywords] of Object.entries(intentMap)) {
    if (keywords.some(k => text.includes(k))) {
      return intent;
    }
  }
  
  return 'general';
}

// ─── Fetch Data Based on Intent ────────────────────────────────

export async function fetchDataByIntent(intent: string, token: string): Promise<any> {
  try {
    switch (intent) {
      case 'leads':
        return await api.get("/leads/get-leads?limit=10", {
          headers: { 'Authorization': `Bearer ${token}` }
        });
      
      case 'deals':
        return await api.get("/api/deals/get-deals?limit=10", {
          headers: { 'Authorization': `Bearer ${token}` }
        });
      
      case 'contacts':
        return await api.get("/api/contact/get-contacts?limit=10", {
          headers: { 'Authorization': `Bearer ${token}` }
        });
      
      case 'companies':
        return await api.get("/api/company/get-companies?limit=10", {
          headers: { 'Authorization': `Bearer ${token}` }
        });
      
      case 'revenue':
        return await api.get("/analytics/revenue/forecast", {
          headers: { 'Authorization': `Bearer ${token}` }
        });
      
      case 'segments':
        return await api.get("/analytics/segments", {
          headers: { 'Authorization': `Bearer ${token}` }
        });
      
      case 'conversion':
        return await api.get("/analytics/conversion/scores", {
          headers: { 'Authorization': `Bearer ${token}` }
        });
      
      case 'recommendations':
        return await api.get("/recommendations", {
          headers: { 'Authorization': `Bearer ${token}` }
        });
      
      case 'expenses':
        return await api.get("/finance/expenses/get-expenses?limit=10", {
          headers: { 'Authorization': `Bearer ${token}` }
        });
      
      case 'invoices':
        return await api.get("/finance/invoices/get-invoices?limit=10", {
          headers: { 'Authorization': `Bearer ${token}` }
        });
      
      case 'employees':
        return await api.get("/hr/employees/get-employees?limit=10", {
          headers: { 'Authorization': `Bearer ${token}` }
        });
      
      case 'attendance':
        return await api.get("/hr/attendance/get-attendance?limit=10", {
          headers: { 'Authorization': `Bearer ${token}` }
        });
      
      case 'leaves':
        return await api.get("/hr/leaves/get-leaves?limit=10", {
          headers: { 'Authorization': `Bearer ${token}` }
        });
      
      case 'campaigns':
        return await api.get("/marketing/campaigns?limit=10", {
          headers: { 'Authorization': `Bearer ${token}` }
        });
      
      case 'projects':
        return await api.get("/projects?limit=10", {
          headers: { 'Authorization': `Bearer ${token}` }
        });
      
      case 'tasks':
        return await api.get("/tasks/get-tasks?limit=10", {
          headers: { 'Authorization': `Bearer ${token}` }
        });
      
      case 'documents':
        return await api.get("/documents/get-documents?limit=10", {
          headers: { 'Authorization': `Bearer ${token}` }
        });
      
      case 'activities':
        return await api.get("/activities/get-activities?limit=10", {
          headers: { 'Authorization': `Bearer ${token}` }
        });
      
      case 'calls':
        return await api.get("/api/calls/get-calls?limit=10", {
          headers: { 'Authorization': `Bearer ${token}` }
        });
      
      case 'emails':
        return await api.get("/email/get-emails?limit=10", {
          headers: { 'Authorization': `Bearer ${token}` }
        });
      
      case 'overview': {
        const [leads, deals, employees, expenses] = await Promise.all([
          api.get("/leads/stats", { headers: { 'Authorization': `Bearer ${token}` } }),
          api.get("/api/deals/pipeline-stats", { headers: { 'Authorization': `Bearer ${token}` } }),
          api.get("/hr/employees/get-employees", { headers: { 'Authorization': `Bearer ${token}` } }),
          api.get("/finance/expenses/dashboard", { headers: { 'Authorization': `Bearer ${token}` } }),
        ]);
        return { leads, deals, employees, expenses };
      }
      
      default:
        return null;
    }
  } catch (error) {
    console.error(`Error fetching data for intent "${intent}":`, error);
    return null;
  }
}

// ─── Format Data for Display ──────────────────────────────────

export function formatDataForResponse(intent: string, data: any): string {
  if (!data) return "No data available for this query.";

  switch (intent) {
    case 'leads': {
      const leads = data?.data?.data || data?.data || [];
      if (!leads.length) return "No leads found.";
      return `📋 **Leads**\n\n${leads.slice(0, 5).map((l: any) => `• ${l.name || l.company || 'Unnamed'}${l.status ? ` (${l.status})` : ''}`).join('\n')}\n\nShowing ${Math.min(leads.length, 5)} of ${leads.length} leads.`;
    }
    
    case 'deals': {
      const deals = data?.data?.data || data?.data || [];
      if (!deals.length) return "No deals found.";
      return `📈 **Deals**\n\n${deals.slice(0, 5).map((d: any) => `• ${d.name || 'Unnamed'} - $${d.amount?.toLocaleString() || '0'}${d.stage ? ` (${d.stage})` : ''}`).join('\n')}\n\nShowing ${Math.min(deals.length, 5)} of ${deals.length} deals.`;
    }
    
    case 'employees': {
      const employees = data?.data?.data || data?.data || [];
      if (!employees.length) return "No employees found.";
      return `👥 **Employees**\n\n${employees.slice(0, 5).map((e: any) => `• ${e.name || 'Unnamed'}${e.designation ? ` - ${e.designation}` : ''}`).join('\n')}\n\nTotal: ${employees.length} employees.`;
    }
    
    case 'revenue': {
      const forecast = data?.data?.datapoints || data?.datapoints || [];
      if (!forecast.length) return "No revenue data available.";
      const latest = forecast[forecast.length - 1];
      return `💰 **Revenue Forecast**\n\n• Latest: $${latest?.forecast?.toLocaleString() || '0'}\n• Currency: ${data?.data?.currency || 'USD'}\n• Period: ${data?.data?.period_days || 90} days\n\n💡 Ask: "Show me the revenue trend"`;
    }
    
    case 'contacts': {
      const contacts = data?.data?.data || data?.data || [];
      if (!contacts.length) return "No contacts found.";
      return `📋 **Contacts**\n\n${contacts.slice(0, 5).map((c: any) => `• ${c.name || c.email || 'Unnamed'}`).join('\n')}\n\nTotal: ${contacts.length} contacts.`;
    }
    
    case 'companies': {
      const companies = data?.data?.data || data?.data || [];
      if (!companies.length) return "No companies found.";
      return `🏢 **Companies**\n\n${companies.slice(0, 5).map((c: any) => `• ${c.name || 'Unnamed'}`).join('\n')}\n\nTotal: ${companies.length} companies.`;
    }
    
    case 'campaigns': {
      const campaigns = data?.data?.data || data?.data || [];
      if (!campaigns.length) return "No campaigns found.";
      return `📢 **Campaigns**\n\n${campaigns.slice(0, 5).map((c: any) => `• ${c.name || 'Unnamed'}${c.status ? ` (${c.status})` : ''}`).join('\n')}\n\nTotal: ${campaigns.length} campaigns.`;
    }
    
    case 'projects': {
      const projects = data?.data?.data || data?.data || [];
      if (!projects.length) return "No projects found.";
      return `📋 **Projects**\n\n${projects.slice(0, 5).map((p: any) => `• ${p.name || 'Unnamed'}${p.status ? ` (${p.status})` : ''}`).join('\n')}\n\nTotal: ${projects.length} projects.`;
    }
    
    case 'tasks': {
      const tasks = data?.data?.data || data?.data || [];
      if (!tasks.length) return "No tasks found.";
      return `✅ **Tasks**\n\n${tasks.slice(0, 5).map((t: any) => `• ${t.title || t.name || 'Unnamed'}${t.status ? ` (${t.status})` : ''}`).join('\n')}\n\nTotal: ${tasks.length} tasks.`;
    }
    
    case 'expenses': {
      const expenses = data?.data?.data || data?.data || [];
      if (!expenses.length) return "No expenses found.";
      return `💳 **Expenses**\n\n${expenses.slice(0, 5).map((e: any) => `• ${e.category || e.description || 'Unnamed'} - $${e.amount?.toLocaleString() || '0'}`).join('\n')}\n\nTotal: ${expenses.length} expenses.`;
    }
    
    case 'invoices': {
      const invoices = data?.data?.data || data?.data || [];
      if (!invoices.length) return "No invoices found.";
      return `📄 **Invoices**\n\n${invoices.slice(0, 5).map((i: any) => `• ${i.invoiceNumber || i.id || 'Unnamed'} - $${i.amount?.toLocaleString() || '0'}${i.status ? ` (${i.status})` : ''}`).join('\n')}\n\nTotal: ${invoices.length} invoices.`;
    }
    
    case 'overview': {
      const leadsCount = data?.leads?.data?.statusStats?.reduce((sum: number, s: any) => sum + (s.count || 0), 0) || 0;
      const dealsCount = data?.deals?.data?.totalCount || 0;
      const employeesCount = data?.employees?.data?.data?.length || 0;
      return `📊 **Dashboard Overview**\n\n• Total Leads: **${leadsCount}**\n• Active Deals: **${dealsCount}**\n• Employees: **${employeesCount}**\n\n💡 Ask about specific metrics for more details.`;
    }
    
    default:
      return "Data retrieved successfully. Ask for specific details.";
  }
}