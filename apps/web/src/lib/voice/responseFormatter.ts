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
    return `${data.name} has no remaining balance. Their fees are fully paid.`;
  }

  let text = `${data.name} has a remaining balance of ${data.amountRemaining.toLocaleString()} rupees. The total fee is ${data.totalFee.toLocaleString()} rupees, and ${data.amountPaid.toLocaleString()} rupees have already been paid.`;

  if (data.lastPaymentAmount && data.lastPaymentAmount > 0) {
    text += ` The last payment of ${data.lastPaymentAmount.toLocaleString()} rupees was made ${data.lastPaymentDate ? `on ${data.lastPaymentDate}` : 'recently'}.`;
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
    return `${data.name}'s daily attendance is not tracked in the database.`;
  }

  const dateStr = 'today';

  switch (data.status) {
    case 'present':
      return `${data.name} is present ${dateStr}.`;
    case 'absent':
      return `${data.name} is absent ${dateStr}.`;
    case 'leave':
      return `${data.name} is on leave ${dateStr}.`;
    case 'unmarked':
      return `${data.name}'s attendance has not been marked ${dateStr}.`;
    default:
      return `${data.name}'s attendance status is unmarked.`;
  }
}

export function formatTotalPaidResponse(data: {
  name: string;
  totalPaid: number;
}): string {
  if (data.totalPaid <= 0) {
    return `${data.name} has not made any payments yet.`;
  }
  return `${data.name} has paid a total of ${data.totalPaid.toLocaleString()} rupees.`;
}

export function formatStatusResponse(data: {
  name: string;
  status: string;
  isActive: boolean;
}): string {
  const statusStr = String(data.status).toLowerCase();
  const activeText = data.isActive ? 'active' : 'inactive';
  return `${data.name}'s current status is "${statusStr}", and their profile record is ${activeText} in the system.`;
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
    return "Great news! The outstanding remaining balance for all departments is zero. No fees are pending.";
  }

  return `The total outstanding remaining balance for Khan Hub is ${data.grandTotal.toLocaleString()} rupees. The breakdown is: Rehab has ${data.rehabTotal.toLocaleString()} rupees, SPIMS Academy has ${data.spimsTotal.toLocaleString()} rupees, Hospital has ${data.hospitalTotal.toLocaleString()} rupees, Welfare has ${data.welfareTotal.toLocaleString()} rupees, Sukoon has ${data.sukoonTotal.toLocaleString()} rupees, and Job Center has ${data.jobcenterTotal.toLocaleString()} rupees outstanding.`;
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
      return `There are no approved earnings or collections in ${label} today.`;
    }
    return `Today's total earnings for ${label} are ${data.grandTotal.toLocaleString()} rupees.`;
  }

  if (data.grandTotal <= 0) {
    return "There are no approved earnings or collections across Khan Hub today.";
  }

  let text = `Today's total approved earnings for Khan Hub are ${data.grandTotal.toLocaleString()} rupees. `;
  
  // Only display departments that earned greater than zero
  const positiveDepts = Object.entries(data.breakdown)
    .filter(([_, amt]) => amt > 0)
    .map(([code, amt]) => `${getDeptLabel(code)} with ${amt.toLocaleString()} rupees`);

  if (positiveDepts.length > 0) {
    text += `This includes: ${positiveDepts.join(', ')}.`;
  }

  return text;
}
