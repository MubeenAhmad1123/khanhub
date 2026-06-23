// apps/web/src/lib/voice/responseFormatter.ts
'use server';
import { getGroqClient, GROQ_MODEL } from './groqClient';

const RESPONSE_SYSTEM_PROMPT = `You are Mubi, a smart voice assistant for Khan Hub ERP system 
in Pakistan. Generate a natural, warm spoken response in Hinglish (Urdu-English mix) based on 
the data provided. 

Rules:
- Speak like a helpful, professional assistant — NOT like a robot reading a template
- Use natural Pakistani Urdu-English mix: "Janaab", "sahib", rupees (not PKR), "abhi tak"
- Always give context beyond the single fact asked — include related numbers when available
- Keep responses under 3 sentences for simple queries, up to 5 for complex ones
- For financial data: always mention remaining + paid + total if available
- For date queries: mention the specific date clearly in the response
- Never say "According to the data" or "The system shows" — speak directly
- Respond ONLY with the spoken text. No JSON. No markdown. Just the sentence(s).`;

export async function generateSpokenResponse(
  queryTopic: string,
  data: Record<string, any>,
  entityName?: string
): Promise<string> {
  try {
    const groq = getGroqClient();

    const userPrompt = `Query type: ${queryTopic}
Entity: ${entityName || 'N/A'}
Data: ${JSON.stringify(data)}
Generate a natural spoken response.`;

    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: RESPONSE_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.4,
      max_tokens: 200,
    });

    return completion.choices[0]?.message?.content?.trim() || 
      fallbackFormatter(queryTopic, data, entityName);
  } catch (err) {
    console.error('[Response Generator] Groq error, falling back to local formatter:', err);
    return fallbackFormatter(queryTopic, data, entityName);
  }
}

function fallbackFormatter(queryTopic: string, data: Record<string, any>, entityName?: string): string {
  try {
    const name = entityName || data.name || 'Unknown';
    switch (queryTopic) {
      case 'remaining_fee':
        return formatRemainingFeeResponse({
          name,
          amountRemaining: Number(data.amountRemaining ?? 0),
          amountPaid: Number(data.amountPaid ?? 0),
          totalFee: Number(data.totalFee ?? 0),
          lastPaymentAmount: Number(data.lastPaymentAmount ?? 0),
          lastPaymentDate: data.lastPaymentDate
        });
      case 'attendance':
        return formatAttendanceResponse({
          status: data.status || 'unmarked',
          date: data.date || '',
          name,
          tracked: !!data.tracked
        });
      case 'total_paid':
        return formatTotalPaidResponse({
          name,
          totalPaid: Number(data.totalPaid ?? 0)
        });
      case 'status':
        return formatStatusResponse({
          name,
          status: data.status || 'Active',
          isActive: data.isActive !== false
        });
      case 'remaining_fee_today':
        return formatTodayRemainingOverallResponse({
          rehabTotal: Number(data.rehabTotal ?? 0),
          spimsTotal: Number(data.spimsTotal ?? 0),
          hospitalTotal: Number(data.hospitalTotal ?? 0),
          sukoonTotal: Number(data.sukoonTotal ?? 0),
          welfareTotal: Number(data.welfareTotal ?? 0),
          jobcenterTotal: Number(data.jobcenterTotal ?? 0),
          grandTotal: Number(data.grandTotal ?? 0)
        });
      case 'earnings_today':
      case 'earnings_date':
        return formatTodayEarningsResponse(
          {
            grandTotal: Number(data.grandTotal ?? data.totalIncome ?? 0),
            breakdown: data.breakdown || {}
          },
          data.departmentCode
        );
      case 'patient_count':
        return `Date ${data.date || ''} par ${data.department || 'all departments'} mein ${data.newAdmissions || 0} naye admissions hue.`;
      default:
        return `Record details for ${name}: ${JSON.stringify(data)}`;
    }
  } catch (err) {
    console.error('[Response Generator] Fallback formatter error:', err);
    return 'Maafi chahta hoon, details fetch karne mein koi masla aaya.';
  }
}

// ==========================================
// LOCAL FORMATTERS (FALLBACKS)
// ==========================================

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
  
  const positiveDepts = Object.entries(data.breakdown)
    .filter(([_, amt]) => amt > 0)
    .map(([code, amt]) => `${getDeptLabel(code)} with ${amt.toLocaleString()} rupees`);

  if (positiveDepts.length > 0) {
    text += `This includes: ${positiveDepts.join(', ')}.`;
  }

  return text;
}
