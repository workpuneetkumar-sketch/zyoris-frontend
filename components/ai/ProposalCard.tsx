import React from 'react';
import { CrmUpdateProposal } from '../../types/ai-proposals';

interface ProposalCardProps {
  proposal: CrmUpdateProposal;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

export function ProposalCard({ proposal, onApprove, onReject }: ProposalCardProps) {
  const getRiskColor = (level: string) => {
    switch (level) {
      case 'LOW': return 'bg-green-100 text-green-800';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
      case 'HIGH': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 mb-4">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Suggested Update for {proposal.targetEntityType} ({proposal.targetEntityId})
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Generated {new Date(proposal.createdAt).toLocaleDateString()}
          </p>
        </div>
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getRiskColor(proposal.riskLevel)}`}>
          {proposal.riskLevel} RISK
        </span>
      </div>

      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Rationale</h4>
        <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded border border-gray-100">
          {proposal.rationale}
        </p>
      </div>

      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Proposed Changes</h4>
        <div className="border border-gray-200 rounded overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Field</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500">New Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {Object.entries(proposal.fieldChanges).map(([field, value]) => (
                <tr key={field}>
                  <td className="px-4 py-2 font-medium text-gray-900">{field}</td>
                  <td className="px-4 py-2 text-green-600 bg-green-50 font-mono text-xs">
                    {JSON.stringify(value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {proposal.evidenceIds && proposal.evidenceIds.length > 0 && (
        <div className="mb-5">
          <h4 className="text-sm font-medium text-gray-700 mb-1">Evidence Sources</h4>
          <div className="flex gap-2">
            {proposal.evidenceIds.map(id => (
              <span key={id} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                {id}
              </span>
            ))}
          </div>
        </div>
      )}

      {proposal.status === 'PENDING' && (
        <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-100">
          <button
            onClick={() => onReject(proposal.id)}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Reject
          </button>
          <button
            onClick={() => onApprove(proposal.id)}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Approve & Apply
          </button>
        </div>
      )}
      
      {proposal.status !== 'PENDING' && (
        <div className="flex justify-end mt-4 pt-4 border-t border-gray-100">
          <span className="text-sm text-gray-500 italic">
            Proposal {proposal.status.toLowerCase()}
          </span>
        </div>
      )}
    </div>
  );
}
