"use client";

import React, { useEffect, useState } from 'react';
import { CrmUpdateProposal } from '../../../../types/ai-proposals';
import { fetchProposals, approveProposal, rejectProposal } from '../../../../lib/api/aiProposalsApi';
import { ProposalCard } from '../../../../components/ai/ProposalCard';
import { Sparkles, CheckCircle } from 'lucide-react';

export default function ProposalsInboxPage() {
  const [proposals, setProposals] = useState<CrmUpdateProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProposals();
  }, []);

  const loadProposals = async () => {
    try {
      setLoading(true);
      const data = await fetchProposals('PENDING');
      setProposals(data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load proposals');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await approveProposal(id);
      // Remove from list or update status
      setProposals(prev => prev.filter(p => p.id !== id));
      // Optionally show a toast notification here
    } catch (err: any) {
      alert(`Error approving: ${err.response?.data?.error || err.message}`);
    }
  };

  const handleReject = async (id: string) => {
    try {
      await rejectProposal(id);
      setProposals(prev => prev.filter(p => p.id !== id));
    } catch (err: any) {
      alert(`Error rejecting: ${err.response?.data?.error || err.message}`);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="md:flex md:items-center md:justify-between mb-8">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-indigo-500" />
            AI CRM Update Proposals
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Review and approve suggested CRM updates generated from recent conversations and activities.
          </p>
        </div>
        <div className="mt-4 flex md:ml-4 md:mt-0">
          <button
            type="button"
            onClick={loadProposals}
            className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 p-4 rounded-md mb-6">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading proposals</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : proposals.length === 0 ? (
        <div className="text-center bg-white rounded-lg border border-gray-200 py-16 px-6">
          <CheckCircle className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-semibold text-gray-900">All caught up</h3>
          <p className="mt-1 text-sm text-gray-500">
            There are no pending AI proposals to review at this time.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {proposals.map(proposal => (
            <ProposalCard
              key={proposal.id}
              proposal={proposal}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          ))}
        </div>
      )}
    </div>
  );
}
