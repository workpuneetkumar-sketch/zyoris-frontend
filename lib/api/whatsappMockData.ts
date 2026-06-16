import { WhatsAppConversation } from "./whatsappApi";

export const MOCK_CONVERSATIONS: WhatsAppConversation[] = [
    {
        id: "mock_1",
        contactName: "Acme Corp (Sarah)",
        contactPhone: "+1 (555) 019-2834",
        leadId: "lead_1",
        leadName: "Acme Corp Opportunity",
        leadStatus: "QUALIFIED",
        unreadCount: 3,
        updatedAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
        messages: [
            { id: "m1_1", text: "Hi, we received your proposal.", sender: "contact", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() },
            { id: "m1_2", text: "Great! Let me know if you have any questions.", sender: "user", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 23).toISOString() },
            { id: "m1_3", text: "Could we jump on a quick call tomorrow to discuss the pricing tier?", sender: "contact", timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString() },
            { id: "m1_4", text: "We're trying to figure out if the Enterprise plan fits our Q3 budget.", sender: "contact", timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString() },
            { id: "m1_5", text: "Also, what are the SLA terms?", sender: "contact", timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString() }
        ]
    },
    {
        id: "mock_2",
        contactName: "TechFlow Solutions",
        contactPhone: "+44 7700 900077",
        unreadCount: 0,
        updatedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        messages: [
            { id: "m2_1", text: "Hello! We are experiencing some downtime with the analytics dashboard. Is this a known issue?", sender: "contact", timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString() },
            { id: "m2_2", text: "Hi there. Yes, we are currently deploying a hotfix. It should be back up in 15 minutes.", sender: "user", timestamp: new Date(Date.now() - 1000 * 60 * 110).toISOString() },
            { id: "m2_3", text: "Perfect, thank you for the quick response.", sender: "contact", timestamp: new Date(Date.now() - 1000 * 60 * 100).toISOString() },
            { id: "m2_4", text: "The dashboard is back online. Please refresh your browser.", sender: "user", timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString() }
        ]
    },
    {
        id: "mock_3",
        contactName: "Michael Chang",
        contactPhone: "+1 (415) 555-0198",
        leadId: "lead_3",
        leadName: "Michael Chang Renewal",
        leadStatus: "NEW",
        unreadCount: 1,
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        messages: [
            { id: "m3_1", text: "Hey, can you send over the updated contract?", sender: "contact", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() }
        ]
    },
    {
        id: "mock_4",
        contactName: "Emma Watson",
        contactPhone: "+61 491 570 156",
        unreadCount: 0,
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
        messages: [
            { id: "m4_1", text: "I'm interested in a demo of Zyoris.", sender: "contact", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString() },
            { id: "m4_2", text: "Sure! I've sent a calendar invite to your email.", sender: "user", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2 - 3600000).toISOString() },
            { id: "m4_3", text: "Got it, looking forward to it.", sender: "contact", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString() }
        ]
    },
    {
        id: "mock_5",
        contactName: "Global Logistics Ltd",
        contactPhone: "+1 (212) 555-8899",
        unreadCount: 0,
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
        messages: [
            { id: "m5_1", text: "The integration with our ERP went perfectly.", sender: "contact", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString() },
            { id: "m5_2", text: "That is fantastic news. Let me know if the data starts flowing into the warehouse properly.", sender: "user", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5 + 300000).toISOString() }
        ]
    },
    {
        id: "mock_6",
        contactName: "David O'Connor",
        contactPhone: "+353 87 123 4567",
        unreadCount: 5,
        updatedAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
        messages: [
            { id: "m6_1", text: "I have a few questions about the CRM module.", sender: "contact", timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString() },
            { id: "m6_2", text: "Does it support custom webhooks?", sender: "contact", timestamp: new Date(Date.now() - 1000 * 60 * 28).toISOString() },
            { id: "m6_3", text: "What about bulk importing leads?", sender: "contact", timestamp: new Date(Date.now() - 1000 * 60 * 25).toISOString() },
            { id: "m6_4", text: "Also, how is the data encrypted at rest?", sender: "contact", timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString() },
            { id: "m6_5", text: "Please get back to me when you can.", sender: "contact", timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString() }
        ]
    },
    {
        id: "mock_7",
        contactName: "Nexus Dynamics",
        contactPhone: "+1 (617) 555-3321",
        unreadCount: 0,
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
        messages: [
            { id: "m7_1", text: "We need to pause our subscription for a month.", sender: "contact", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10 - 500000).toISOString() },
            { id: "m7_2", text: "I have updated your billing profile. Your subscription is paused.", sender: "user", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString() }
        ]
    },
    {
        id: "mock_8",
        contactName: "Sophia Martinez",
        contactPhone: "+34 600 123 456",
        unreadCount: 1,
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 1).toISOString(),
        messages: [
            { id: "m8_1", text: "Can you send the API documentation for the Recommendations endpoint?", sender: "contact", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 1).toISOString() }
        ]
    },
    {
        id: "mock_9",
        contactName: "Quantum Partners",
        contactPhone: "+1 (310) 555-7788",
        unreadCount: 0,
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString(),
        messages: [
            { id: "m9_1", text: "Is there a way to export the CFO dashboard to PDF?", sender: "contact", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1 - 3600000).toISOString() },
            { id: "m9_2", text: "Yes, click the export icon in the top right corner of the dashboard.", sender: "user", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1 - 1800000).toISOString() },
            { id: "m9_3", text: "Found it, thanks!", sender: "contact", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString() }
        ]
    },
    {
        id: "mock_10",
        contactName: "Oliver Smith",
        contactPhone: "+44 7911 123456",
        unreadCount: 0,
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
        messages: [
            { id: "m10_1", text: "Checking in to see if the custom reporting feature is live yet.", sender: "contact", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 49).toISOString() },
            { id: "m10_2", text: "Not yet, it is scheduled for the next release on Friday.", sender: "user", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString() }
        ]
    },
    {
        id: "mock_11",
        contactName: "Alpha Industries",
        contactPhone: "+1 (800) 555-1000",
        unreadCount: 2,
        updatedAt: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
        messages: [
            { id: "m11_1", text: "The demand forecast seems off for our EMEA region.", sender: "contact", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() },
            { id: "m11_2", text: "I'll have our data science team take a look. Did you recently add new inventory lines?", sender: "user", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 1).toISOString() },
            { id: "m11_3", text: "Yes, we acquired a new warehouse last week.", sender: "contact", timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString() },
            { id: "m11_4", text: "We need the model retrained ASAP.", sender: "contact", timestamp: new Date(Date.now() - 1000 * 60 * 3).toISOString() }
        ]
    },
    {
        id: "mock_12",
        contactName: "Mia Wong",
        contactPhone: "+65 8123 4567",
        unreadCount: 0,
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 20).toISOString(),
        messages: [
            { id: "m12_1", text: "Thanks for the swift onboarding.", sender: "contact", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 20).toISOString() }
        ]
    }
];
