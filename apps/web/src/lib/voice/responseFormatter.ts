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
