"use client";

import React, { useState } from "react";
import { Mail, MessageCircle, Plus, Edit2, Trash2, Eye } from "lucide-react";

type TemplateType = "email" | "whatsapp";

interface Template {
    id: string;
    type: TemplateType;
    name: string;
    subject?: string; // Optional for WhatsApp
    body: string;
}

const mockTemplates: Template[] = [
    {
        id: "1",
        type: "email",
        name: "Welcome Email",
        subject: "Welcome to our platform, {{name}}!",
        body: "Hi {{name}},\n\nWe are excited to have you on board. Your company, {{company}}, is now setup.\n\nBest,\nTeam"
    },
    {
        id: "2",
        type: "whatsapp",
        name: "Meeting Reminder",
        body: "Hi {{name}}, just a reminder about our meeting tomorrow. Reply to {{email}} if you need to reschedule."
    }
];

export default function TemplatesPage() {
    const [templates, setTemplates] = useState<Template[]>(mockTemplates);
    const [filter, setFilter] = useState<TemplateType | "all">("all");
    const [isEditing, setIsEditing] = useState(false);
    const [currentTemplate, setCurrentTemplate] = useState<Partial<Template>>({});

    const filteredTemplates = templates.filter(t => filter === "all" || t.type === filter);

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (currentTemplate.id) {
            setTemplates(templates.map(t => t.id === currentTemplate.id ? currentTemplate as Template : t));
        } else {
            setTemplates([...templates, { ...currentTemplate, id: Date.now().toString() } as Template]);
        }
        setIsEditing(false);
    };

    const handleDelete = (id: string) => {
        setTemplates(templates.filter(t => t.id !== id));
    };

    const openEditor = (template?: Template) => {
        if (template) {
            setCurrentTemplate({ ...template });
        } else {
            setCurrentTemplate({ type: "email", name: "", subject: "", body: "" });
        }
        setIsEditing(true);
    };

    const previewData = {
        name: "John Doe",
        company: "Acme Corp",
        email: "john@acme.com"
    };

    const renderPreview = (text?: string) => {
        if (!text) return "";
        return text
            .replace(/{{name}}/g, previewData.name)
            .replace(/{{company}}/g, previewData.company)
            .replace(/{{email}}/g, previewData.email);
    };

    return (
        <div className="flex flex-col h-[calc(100vh-theme(spacing.16))] p-6 bg-gray-50/50">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Message Templates</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage your email and WhatsApp templates</p>
                </div>
                <button
                    onClick={() => openEditor()}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
                >
                    <Plus size={18} /> New Template
                </button>
            </div>

            {isEditing ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col md:flex-row gap-8 flex-1 min-h-0">
                    <div className="flex-1 overflow-y-auto pr-4">
                        <h2 className="text-lg font-semibold text-gray-900 mb-6">{currentTemplate.id ? "Edit Template" : "Create Template"}</h2>
                        <form id="template-form" onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                                <select 
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 transition-all"
                                    value={currentTemplate.type}
                                    onChange={e => setCurrentTemplate({...currentTemplate, type: e.target.value as TemplateType})}
                                >
                                    <option value="email">Email</option>
                                    <option value="whatsapp">WhatsApp</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Template Name</label>
                                <input 
                                    required 
                                    type="text" 
                                    value={currentTemplate.name || ""} 
                                    onChange={e => setCurrentTemplate({...currentTemplate, name: e.target.value})}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 transition-all"
                                    placeholder="e.g. Welcome Series 1"
                                />
                            </div>
                            {currentTemplate.type === "email" && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                                    <input 
                                        required 
                                        type="text" 
                                        value={currentTemplate.subject || ""} 
                                        onChange={e => setCurrentTemplate({...currentTemplate, subject: e.target.value})}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 transition-all"
                                    />
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Message Body</label>
                                <p className="text-xs text-gray-500 mb-2">Available variables: {'{{name}}, {{company}}, {{email}}'}</p>
                                <textarea 
                                    required 
                                    rows={8}
                                    value={currentTemplate.body || ""} 
                                    onChange={e => setCurrentTemplate({...currentTemplate, body: e.target.value})}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 transition-all resize-none"
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors">Cancel</button>
                                <button type="submit" className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors">Save Template</button>
                            </div>
                        </form>
                    </div>
                    <div className="flex-1 bg-gray-50 rounded-xl border border-gray-200 p-6 overflow-y-auto">
                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2"><Eye size={16}/> Live Preview</h3>
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                            {currentTemplate.type === "email" && (
                                <div className="border-b border-gray-100 pb-3 mb-3">
                                    <p className="text-sm text-gray-500 mb-1">Subject:</p>
                                    <p className="font-medium text-gray-900">{renderPreview(currentTemplate.subject) || <span className="text-gray-400 italic">No subject</span>}</p>
                                </div>
                            )}
                            <p className="text-sm text-gray-500 mb-1">Body:</p>
                            <div className="text-gray-800 text-sm whitespace-pre-wrap">
                                {renderPreview(currentTemplate.body) || <span className="text-gray-400 italic">No message body</span>}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex-1 flex flex-col overflow-hidden">
                    <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100">
                        {(["all", "email", "whatsapp"] as const).map(t => (
                            <button
                                key={t}
                                onClick={() => setFilter(t)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                                    filter === t ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                }`}
                            >
                                {t === "all" ? "All Templates" : t}
                            </button>
                        ))}
                    </div>
                    <div className="flex-1 overflow-y-auto p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {filteredTemplates.map(template => (
                                <div key={template.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow group flex flex-col">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${template.type === 'email' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                                {template.type === 'email' ? <Mail size={20} /> : <MessageCircle size={20} />}
                                            </div>
                                            <h3 className="font-semibold text-gray-900">{template.name}</h3>
                                        </div>
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                            <button onClick={() => openEditor(template)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"><Edit2 size={16}/></button>
                                            <button onClick={() => handleDelete(template.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"><Trash2 size={16}/></button>
                                        </div>
                                    </div>
                                    {template.type === "email" && template.subject && (
                                        <p className="text-sm font-medium text-gray-700 mb-2 truncate">{template.subject}</p>
                                    )}
                                    <p className="text-sm text-gray-500 line-clamp-3 flex-1">{template.body}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
