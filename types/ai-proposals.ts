export type ProposalRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type ProposalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'APPLIED';

export interface CrmUpdateProposal {
  id: string;
  organizationId: string;
  targetEntityType: string;
  targetEntityId: string;
  fieldChanges: Record<string, any>;
  evidenceIds: string[];
  riskLevel: ProposalRiskLevel;
  rationale: string;
  status: ProposalStatus;
  reviewedById?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}
