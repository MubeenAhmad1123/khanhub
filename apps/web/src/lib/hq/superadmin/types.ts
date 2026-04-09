// apps/web/src/lib/hq/superadmin/types.ts

export type DeptFilter = 'all' | 'rehab' | 'spims' | 'hq';
export type TxStatusFilter = 'pending' | 'approved' | 'rejected' | 'history';

export type AmountBucket = 'all' | 'under_1000' | '1000_5000' | '5000_20000' | 'over_20000';
export type ProofFilter = 'all' | 'has_proof' | 'missing_proof';
export type SortOrder = 'newest' | 'oldest' | 'highest' | 'lowest';

export type AuditSource = 'hq' | 'rehab' | 'spims';
export type AuditAction = 'created' | 'updated' | 'approved' | 'rejected' | 'login' | 'reset' | 'other';

export type HqSettings = {
  enabledDepartments: Record<string, boolean>;
  approvalThresholds: {
    requireProofOverPkr: number;
  };
  notificationPrefs: {
    txForwarded: boolean;
    txApproved: boolean;
    txRejected: boolean;
    reconciliationFlagged: boolean;
    salaryApproved: boolean;
  };
  systemInfo?: {
    firebaseProject?: string;
    lastDeployDate?: string;
  };
};

export type UnifiedAuditEntry = {
  id: string;
  source: AuditSource;
  createdAt: unknown;
  actorName: string;
  actorId?: string;
  action: AuditAction;
  message: string;
  entityLabel?: string;
  entityId?: string;
  dept?: 'rehab' | 'spims' | 'hq';
};

export type UnifiedTx = {
  id: string;
  dept: 'rehab' | 'spims';
  status: string;
  createdAt?: unknown;
  date?: unknown;
  transactionDate?: unknown;
  amount: number;
  type?: string;
  category?: string;
  categoryName?: string;
  proofUrl?: string | null;
  proofRequired?: boolean;
  description?: string;
  patientId?: string;
  patientName?: string;
  studentId?: string;
  studentName?: string;
  staffId?: string;
  staffName?: string;
  cashierId?: string;
  cashierName?: string;
  feePaymentId?: string;
  processedBy?: string;
  processedAt?: unknown;
  rejectedReason?: string;
};

