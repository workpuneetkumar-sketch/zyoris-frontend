import { NextRequest, NextResponse } from "next/server";
import { detectIntent, fetchDataByIntent, formatDataForResponse } from "@/lib/chatDataService";

// ─── System Prompt with All API Knowledge ─────────────────────

function buildSystemPrompt(context: {
  org?: any;
  roleContext?: string;
  role?: string;
}): string {
  const { org, roleContext, role } = context;
  
  return `You are ZY BOT, the intelligent performance assistant for Zyoris.

## Organization Data:
- Company: ${org?.name || 'Zyoris'}
- Industry: ${org?.industry || 'Technology'}
- Active Deals: ${org?.activeDeals || 0}
- Total Leads: ${org?.leadsCount || 0}
- Revenue: $${org?.totalRevenue?.toLocaleString() || '0'}
- Employees: ${org?.employees || 0}

## Your Capabilities:
You can answer questions about:

### Sales & CRM
- **Leads**: Track, filter, and manage leads
- **Deals**: Pipeline, stages, amounts, probabilities
- **Contacts**: All contacts and their details
- **Companies**: Company profiles and relationships
- **Activities**: Call logs, emails, meetings

### Analytics
- **Revenue Forecast**: 90-day revenue projections
- **Segments**: Customer segment analysis
- **Conversion**: Deal conversion probabilities
- **Recommendations**: AI-powered strategic advice

### Finance
- **Expenses**: Track and manage expenses
- **Invoices**: Invoice status and details

### HR
- **Employees**: Staff list and details
- **Attendance**: Check-in/out records
- **Leaves**: Leave requests and approvals

### Marketing
- **Campaigns**: Marketing campaign performance

### Projects & Tasks
- **Projects**: Project status and milestones
- **Tasks**: Task tracking and completion

Role Context:
${roleContext || `You are speaking with a ${role || 'Zyoris'} user.`}

Important: You are speaking with a ${role || 'User'}. Tailor your responses to their specific role.

Personality: Friendly, intelligent, confident, slightly playful. Expert in sales strategy, revenue analytics, and business intelligence.

Response Guidelines:
1. **Be Specific**: Use actual data from the APIs
2. **Be Proactive**: Suggest relevant follow-up questions
3. **Be Structured**: Use bullet points and bold text
4. **Be Professional**: Clean business English

FORMATTING: Use **bold** for important terms. Use • for bullet points.`;
}

function normalizeMessage(m: string): string {
  return m.trim().toLowerCase().replace(/\s+/g, " ");
}

function getFallbackReply(messages: { role: string; content: string }[], context?: any): string {
  const last = messages[messages.length - 1];
  if (!last || last.role !== "user") {
    return "Hi 👋 I'm **ZY BOT**. Ask me about leads, deals, revenue, or anything about your business!";
  }
  
  const text = normalizeMessage(last.content);
  const orgName = context?.org?.name || 'your company';
  const role = context?.role || 'User';
  const deals = context?.org?.activeDeals || 0;
  const leads = context?.org?.leadsCount || 0;
  const revenue = context?.org?.totalRevenue || 0;
  const employees = context?.org?.employees || 0;

  // ─── Intent-based responses ──────────────────────────────────
  
  // Sales & CRM
  if (text.includes("lead") || text.includes("prospect")) {
    return `📊 **Leads Overview for ${orgName}**\n\n• Total Leads: **${leads}**\n• **Priority**: Follow up on hot leads\n• **Status**: Track lead progress\n\n💡 Try asking: "Show me my leads" or "Filter leads by status"`;
  }
  
  if (text.includes("deal") || text.includes("pipeline")) {
    return `📈 **Deal Pipeline for ${orgName}**\n\n• Active Deals: **${deals}**\n• **Tip**: Focus on closing high-value deals\n• **Stage**: Track deal progress\n\n💡 Try: "Show me my top deals" or "Which deals are at risk?"`;
  }
  
  if (text.includes("contact")) {
    return `📋 **Contacts**\n\n• Manage all your contacts in one place\n• Track interactions and relationships\n• Export contacts as CSV\n\n💡 Try: "Show me my contacts" or "Add a new contact"`;
  }
  
  if (text.includes("company") && !text.includes("name")) {
    return `🏢 **Companies**\n\n• Track all companies in your CRM\n• View company details and contacts\n• Manage company relationships\n\n💡 Try: "Show me my companies" or "Find company by name"`;
  }

  // Analytics
  if (text.includes("revenue") || text.includes("forecast") || text.includes("financial")) {
    return `💰 **Revenue Insights for ${orgName}**\n\n• Revenue: **$${revenue.toLocaleString()}**\n• Active Deals: **${deals}**\n• Total Leads: **${leads}**\n\n💡 Try: "Show me revenue forecast" or "What's our growth trend?"`;
  }
  
  if (text.includes("segment") || text.includes("cluster")) {
    return `📊 **Customer Segments**\n\n• Analyze your customer base\n• Identify high-value segments\n• Target marketing efforts\n\n💡 Try: "Show me customer segments" or "Which segment is most profitable?"`;
  }
  
  if (text.includes("conversion") || text.includes("win rate")) {
    return `🎯 **Conversion Analytics**\n\n• Track deal conversion probabilities\n• Identify winning strategies\n• Optimize sales process\n\n💡 Try: "Show me conversion scores" or "How can we improve win rates?"`;
  }
  
  if (text.includes("recommendation") || text.includes("advice") || text.includes("suggestion")) {
    return `💡 **AI Recommendations**\n\n• Get strategic business advice\n• Identify growth opportunities\n• Optimize operations\n\n💡 Try: "Give me recommendations" or "What should I focus on?"`;
  }

  // Finance
  if (text.includes("expense") || text.includes("cost") || text.includes("spend")) {
    return `💳 **Expense Management**\n\n• Track all business expenses\n• Analyze spending patterns\n• Optimize budget allocation\n\n💡 Try: "Show me expenses" or "What's our biggest expense?"`;
  }
  
  if (text.includes("invoice")) {
    return `📄 **Invoices**\n\n• View all invoices\n• Track payment status\n• Generate reports\n\n💡 Try: "Show me invoices" or "What invoices are pending?"`;
  }

  // HR
  if (text.includes("employee") || text.includes("staff") || text.includes("team")) {
    return `👥 **Employee Overview for ${orgName}**\n\n• Total Employees: **${employees}**\n• Manage employee records\n• Track attendance and leaves\n\n💡 Try: "Show me employees" or "Who's on leave?"`;
  }
  
  if (text.includes("attendance")) {
    return `📋 **Attendance**\n\n• Track employee check-in/out\n• View attendance records\n• Generate attendance reports\n\n💡 Try: "Show today's attendance" or "Who's absent?"`;
  }
  
  if (text.includes("leave") || text.includes("holiday") || text.includes("time off")) {
    return `🌴 **Leave Management**\n\n• View leave requests\n• Track approvals\n• Manage team availability\n\n💡 Try: "Show pending leaves" or "Apply for leave"`;
  }

  // Marketing
  if (text.includes("campaign") || text.includes("marketing")) {
    return `📢 **Marketing Campaigns**\n\n• View all campaigns\n• Track performance metrics\n• Optimize marketing ROI\n\n💡 Try: "Show me campaigns" or "What's our best campaign?"`;
  }

  // Projects & Tasks
  if (text.includes("project")) {
    return `📋 **Projects**\n\n• Track project progress\n• View milestones\n• Manage team members\n\n💡 Try: "Show me projects" or "What's the project status?"`;
  }
  
  if (text.includes("task") || text.includes("todo")) {
    return `✅ **Tasks**\n\n• Track all tasks\n• View task status\n• Manage assignments\n\n💡 Try: "Show me tasks" or "What tasks are pending?"`;
  }

  // Documents
  if (text.includes("document") || text.includes("file")) {
    return `📁 **Documents**\n\n• View all documents\n• Upload and manage files\n• Download documents\n\n💡 Try: "Show me documents" or "Upload a document"`;
  }

  // Activities
  if (text.includes("activity") || text.includes("action")) {
    return `📝 **Activities**\n\n• View recent activities\n• Track interactions\n• Monitor engagement\n\n💡 Try: "Show me activities" or "What's new?"`;
  }

  // Communications
  if (text.includes("call") || text.includes("phone")) {
    return `📞 **Calls**\n\n• View call logs\n• Track call history\n• Log new calls\n\n💡 Try: "Show me calls" or "Log a call"`;
  }
  
  if (text.includes("email") || text.includes("mail")) {
    return `📧 **Emails**\n\n• View email logs\n• Send and track emails\n• Manage communication\n\n💡 Try: "Show me emails" or "Send an email"`;
  }

  // Overview / General
  if (text.includes("overview") || text.includes("summary") || text.includes("dashboard")) {
    return `📊 **Dashboard Overview for ${orgName}**\n\n• Company: **${orgName}**\n• Your Role: **${role}**\n• Active Deals: **${deals}**\n• Total Leads: **${leads}**\n• Employees: **${employees}**\n• Revenue: **$${revenue.toLocaleString()}**\n\n💡 Try asking about leads, deals, revenue, or team members.`;
  }

  // Hi/Hello
  if (text.includes("hi") || text.includes("hello") || text.includes("hey")) {
    return `Hi 👋 I'm **ZY BOT**. I'm here to help you grow ${orgName}.\n\n📊 **Quick Snapshot:**\n• Company: ${orgName}\n• Your Role: ${role}\n• Active Deals: ${deals}\n• Total Leads: ${leads}\n\n💡 Try asking: "Show me my deals" or "What's our revenue?"`;
  }

  // Default
  return `I'm here to help **${orgName}** succeed. As **${role}**, ask me about:\n\n• **Leads**: ${leads} total\n• **Deals**: ${deals} active\n• **Employees**: ${employees} team members\n• **Revenue**: $${revenue.toLocaleString()}\n\n💡 Try: "Show me my deals" or "Give me an overview"`;
}

// ─── POST Handler ──────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      messages = [], 
      sessionId,
      orgContext,
      roleContext,
      userRole,
      token
    } = body as { 
      messages?: { role: string; content: string }[]; 
      sessionId?: string;
      orgContext?: any;
      roleContext?: string;
      userRole?: string;
      token?: string;
    };
    
    const apiKey = process.env.OPENAI_API_KEY;

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Messages array required" }, { status: 400 });
    }

    // ─── Detect Intent and Fetch Data ──────────────────────────

    const lastUserMessage = messages.filter(m => m.role === 'user').pop()?.content || '';
    const intent = detectIntent(lastUserMessage);
    console.log('🎯 Detected intent:', intent);

    let intentData = null;
    let formattedData = null;

    // Try to fetch data if intent is specific
    if (intent !== 'general' && token) {
      try {
        intentData = await fetchDataByIntent(intent, token);
        if (intentData) {
          formattedData = formatDataForResponse(intent, intentData);
          console.log('📊 Fetched data for intent:', intent);
        }
      } catch (e) {
        console.warn('Could not fetch intent data:', e);
      }
    }

    // ─── Build System Prompt ────────────────────────────────────

    const systemPrompt = buildSystemPrompt({
      org: orgContext,
      roleContext: roleContext,
      role: userRole
    });

    // ─── Try OpenAI API ─────────────────────────────────────────

    if (apiKey) {
      try {
        const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: systemPrompt },
              ...messages.map((m: { role: string; content: string }) => ({
                role: m.role === "assistant" ? "assistant" : "user",
                content: m.content,
              })),
            ],
            max_tokens: 600,
            temperature: 0.7,
          }),
        });

        if (openaiRes.ok) {
          const data = (await openaiRes.json()) as { choices?: { message?: { content?: string } }[] };
          const content = data.choices?.[0]?.message?.content?.trim();
          if (content) {
            return NextResponse.json({ message: content });
          }
        } else {
          console.error("OpenAI error:", await openaiRes.text());
        }
      } catch (openaiError) {
        console.error("OpenAI request failed:", openaiError);
      }
    }

    // ─── Fallback: Enhanced Context-Aware Response ─────────────

    let reply;
    if (formattedData) {
      reply = formattedData;
    } else {
      reply = getFallbackReply(messages, { org: orgContext, role: userRole });
    }
    
    return NextResponse.json({ message: reply });
    
  } catch (e) {
    console.error("Chat API error:", e);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}