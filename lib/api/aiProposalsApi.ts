import api from './api';
import { CrmUpdateProposal, ProposalStatus } from '../../types/ai-proposals';

export async function fetchProposals(status?: ProposalStatus): Promise<CrmUpdateProposal[]> {
  const params = status ? { status } : {};
  const res = await api.get('/internal/ai/crm-update-proposals', { params });
  return res.data;
}

export async function approveProposal(id: string): Promise<CrmUpdateProposal> {
  const res = await api.post(`/internal/ai/crm-update-proposals/${id}/approve`);
  return res.data;
}

export async function rejectProposal(id: string): Promise<CrmUpdateProposal> {
  const res = await api.post(`/internal/ai/crm-update-proposals/${id}/reject`);
  return res.data;
}
