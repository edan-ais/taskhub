import { parseISO, addDays, addWeeks, addMonths, startOfWeek, endOfWeek, nextMonday, nextFriday } from 'date-fns';

export interface ParsedEmailMetadata {
  tags: string[];
  assignees: string[];
  dueDate: string | null;
  priority: 'urgent' | 'high' | 'normal' | 'low' | null;
  isIdea: boolean;
  isTask: boolean;
}

export function parseEmailContent(subject: string, body: string): ParsedEmailMetadata {
  const fullText = `${subject} ${body}`.toLowerCase();

  return {
    tags: extractHashtags(body),
    assignees: extractMentions(body),
    dueDate: extractDueDate(fullText),
    priority: extractPriority(subject, body),
    isIdea: detectIsIdea(fullText),
    isTask: detectIsTask(fullText),
  };
}

export function extractHashtags(text: string): string[] {
  const hashtagRegex = /#([a-zA-Z0-9_]+)/g;
  const matches = text.match(hashtagRegex);

  if (!matches) return [];

  return matches.map(tag => tag.slice(1));
}

export function extractMentions(text: string): string[] {
  const mentionRegex = /@([a-zA-Z0-9_\s]+?)(?=\s|$|,|\.)/g;
  const matches = text.match(mentionRegex);

  if (!matches) return [];

  return matches.map(mention => mention.slice(1).trim());
}

export function extractDueDate(text: string): string | null {
  const today = new Date();
  const normalizedText = text.toLowerCase();

  if (normalizedText.includes('due today') || normalizedText.includes('today')) {
    return today.toISOString();
  }

  if (normalizedText.includes('due tomorrow') || normalizedText.includes('tomorrow')) {
    return addDays(today, 1).toISOString();
  }

  if (normalizedText.includes('this week') || normalizedText.includes('end of week')) {
    return endOfWeek(today).toISOString();
  }

  if (normalizedText.includes('next week')) {
    return endOfWeek(addWeeks(today, 1)).toISOString();
  }

  if (normalizedText.includes('next monday') || normalizedText.includes('monday')) {
    return nextMonday(today).toISOString();
  }

  if (normalizedText.includes('next friday') || normalizedText.includes('friday') || normalizedText.includes('eow')) {
    return nextFriday(today).toISOString();
  }

  const inDaysMatch = normalizedText.match(/in (\d+) days?/);
  if (inDaysMatch) {
    const days = parseInt(inDaysMatch[1]);
    return addDays(today, days).toISOString();
  }

  const inWeeksMatch = normalizedText.match(/in (\d+) weeks?/);
  if (inWeeksMatch) {
    const weeks = parseInt(inWeeksMatch[1]);
    return addWeeks(today, weeks).toISOString();
  }

  const inMonthsMatch = normalizedText.match(/in (\d+) months?/);
  if (inMonthsMatch) {
    const months = parseInt(inMonthsMatch[1]);
    return addMonths(today, months).toISOString();
  }

  const dueDateMatch = normalizedText.match(/due:?\s*(\d{4}-\d{2}-\d{2})/);
  if (dueDateMatch) {
    try {
      return parseISO(dueDateMatch[1]).toISOString();
    } catch {
      return null;
    }
  }

  const dueDateSlashMatch = normalizedText.match(/due:?\s*(\d{1,2}\/\d{1,2}\/\d{4})/);
  if (dueDateSlashMatch) {
    try {
      const [month, day, year] = dueDateSlashMatch[1].split('/');
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).toISOString();
    } catch {
      return null;
    }
  }

  return null;
}

export function extractPriority(subject: string, body: string): 'urgent' | 'high' | 'normal' | 'low' | null {
  const fullText = `${subject} ${body}`.toLowerCase();

  if (
    fullText.includes('urgent') ||
    fullText.includes('asap') ||
    fullText.includes('emergency') ||
    fullText.includes('critical') ||
    subject.includes('!!!') ||
    subject.toUpperCase() === subject
  ) {
    return 'urgent';
  }

  if (
    fullText.includes('high priority') ||
    fullText.includes('important') ||
    fullText.includes('priority: high') ||
    subject.includes('!!')
  ) {
    return 'high';
  }

  if (
    fullText.includes('low priority') ||
    fullText.includes('priority: low') ||
    fullText.includes('when you get a chance') ||
    fullText.includes('no rush')
  ) {
    return 'low';
  }

  return 'normal';
}

export function detectIsIdea(text: string): boolean {
  const ideaKeywords = [
    'what if',
    'suggestion',
    'suggest',
    'idea',
    'could we',
    'should we',
    'would it be possible',
    'feature request',
    'enhancement',
    'consider',
    'thinking about',
    'brainstorm',
    'proposal',
    'recommend',
  ];

  return ideaKeywords.some(keyword => text.includes(keyword));
}

export function detectIsTask(text: string): boolean {
  const taskKeywords = [
    'please',
    'need',
    'required',
    'must',
    'urgent',
    'action item',
    'to do',
    'task',
    'complete',
    'finish',
    'deliver',
    'implement',
    'fix',
    'resolve',
    'address',
  ];

  return taskKeywords.some(keyword => text.includes(keyword));
}

export function extractSenderInfo(senderEmail: string, senderName?: string): { name: string; email: string } {
  const email = senderEmail.trim().toLowerCase();

  let name = senderName || '';

  if (!name) {
    const namePart = email.split('@')[0];
    name = namePart
      .split(/[._-]/)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  return { name, email };
}

export function cleanEmailBody(html: string, text: string): string {
  if (text && text.trim()) {
    const lines = text.split('\n');
    const cleanedLines = [];

    for (const line of lines) {
      if (line.trim().startsWith('>')) continue;
      if (line.trim().startsWith('On ') && line.includes('wrote:')) break;
      if (line.trim() === '--') break;
      cleanedLines.push(line);
    }

    return cleanedLines.join('\n').trim();
  }

  if (html) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    return tempDiv.textContent || tempDiv.innerText || '';
  }

  return '';
}
