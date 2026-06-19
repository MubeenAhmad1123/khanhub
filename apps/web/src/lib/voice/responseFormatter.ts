// apps/web/src/lib/voice/responseFormatter.ts

export function formatRemainingFeeResponse(data: {
  name: string;
  amountRemaining: number;
  amountPaid: number;
  totalFee: number;
  lastPaymentAmount?: number;
  lastPaymentDate?: string;
}): string {
  if (data.amountRemaining <= 0) {
    return `${data.name} ka koi remaining balance nahi hai. Unki fees mukammal jama ho chuki hai.`;
  }

  let text = `${data.name} ka remaining balance ${data.amountRemaining.toLocaleString()} rupees hai. Total fee ${data.totalFee.toLocaleString()} hai, aur ${data.amountPaid.toLocaleString()} rupees already paid ho chuki hai.`;

  if (data.lastPaymentAmount && data.lastPaymentAmount > 0) {
    text += ` Last payment ${data.lastPaymentAmount.toLocaleString()} rupees ki ${data.lastPaymentDate ? `${data.lastPaymentDate} ko` : 'hui thi'}.`;
  }

  return text;
}

export function formatAttendanceResponse(data: {
  status: string;
  date: string;
  name: string;
  tracked: boolean;
}): string {
  if (!data.tracked) {
    return `${data.name} ki daily attendance database me track nahi ki jati.`;
  }

  const dateStr = 'aaj'; // Default to today's context

  switch (data.status) {
    case 'present':
      return `${data.name} ${dateStr} present hain.`;
    case 'absent':
      return `${data.name} ${dateStr} absent hain.`;
    case 'leave':
      return `${data.name} ${dateStr} leave par hain.`;
    case 'unmarked':
      return `${data.name} ki attendance ${dateStr} mark nahi ki gayi hai.`;
    default:
      return `${data.name} ki attendance status unmarked hai.`;
  }
}

export function formatTotalPaidResponse(data: {
  name: string;
  totalPaid: number;
}): string {
  if (data.totalPaid <= 0) {
    return `${data.name} ne ab tak koi payment jama nahi karwayi hai.`;
  }
  return `${data.name} ne ab tak total ${data.totalPaid.toLocaleString()} rupees jama karwaye hain.`;
}

export function formatStatusResponse(data: {
  name: string;
  status: string;
  isActive: boolean;
}): string {
  const statusStr = String(data.status).toLowerCase();
  const activeText = data.isActive ? 'active' : 'inactive';
  return `${data.name} ka current status "${statusStr}" hai, aur unka profile record system me ${activeText} hai.`;
}

// UPGRADE: Format total outstanding remaining balances
export function formatTodayRemainingOverallResponse(data: {
  rehabTotal: number;
  spimsTotal: number;
  hospitalTotal: number;
  sukoonTotal: number;
  welfareTotal: number;
  jobcenterTotal: number;
  grandTotal: number;
}): string {
  if (data.grandTotal <= 0) {
    return "Mubarak ho! Tamam departments ka outstanding remaining balance zero hai. Koi fee baki nahi hai.";
  }

  return `Khan Hub ka total outstanding remaining balance ${data.grandTotal.toLocaleString()} rupees hai. Breakdown ye hai: Rehab ka ${data.rehabTotal.toLocaleString()} rupees, SPIMS Academy ka ${data.spimsTotal.toLocaleString()} rupees, Hospital ka ${data.hospitalTotal.toLocaleString()} rupees, Welfare ka ${data.welfareTotal.toLocaleString()} rupees, Sukoon ka ${data.sukoonTotal.toLocaleString()} rupees, aur Job Center ka ${data.jobcenterTotal.toLocaleString()} rupees outstanding hai.`;
}

// UPGRADE: Format today's earnings / collection response
export function formatTodayEarningsResponse(
  data: { grandTotal: number; breakdown: Record<string, number> },
  deptCode?: string
): string {
  const getDeptLabel = (code: string): string => {
    const labels: Record<string, string> = {
      rehab: 'Rehab Center',
      spims: 'SPIMS Academy',
      hospital: 'Khan Hospital',
      sukoon: 'Sukoon Center',
      welfare: 'Welfare Foundation',
      'job-center': 'Job Center',
      'hq': 'HQ Cashier',
    };
    return labels[code] || code.toUpperCase();
  };

  if (deptCode && deptCode !== 'overall') {
    const label = getDeptLabel(deptCode);
    if (data.grandTotal <= 0) {
      return `Aaj ${label} me ab tak koi approved earning ya collection nahi hui hai.`;
    }
    return `Aaj ${label} ki total earning ${data.grandTotal.toLocaleString()} rupees hai.`;
  }

  if (data.grandTotal <= 0) {
    return "Aaj overall Khan Hub me ab tak koi approved earning ya collection nahi hui hai.";
  }

  let text = `Aaj Khan Hub ki overall total approved earning ${data.grandTotal.toLocaleString()} rupees hai. `;
  
  // Only display departments that earned greater than zero
  const positiveDepts = Object.entries(data.breakdown)
    .filter(([_, amt]) => amt > 0)
    .map(([code, amt]) => `${getDeptLabel(code)} ki ${amt.toLocaleString()} rupees`);

  if (positiveDepts.length > 0) {
    text += `Jis me: ${positiveDepts.join(', ')} collection shamil hai.`;
  }

  return text;
}
