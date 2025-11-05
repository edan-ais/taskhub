import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ParsedMetadata {
  tags: string[];
  assignees: string[];
  dueDate: string | null;
  priority: string | null;
  isIdea: boolean;
  isTask: boolean;
}

function extractHashtags(text: string): string[] {
  const hashtagRegex = /#([a-zA-Z0-9_]+)/g;
  const matches = text.match(hashtagRegex);
  return matches ? matches.map(tag => tag.slice(1)) : [];
}

function extractMentions(text: string): string[] {
  const mentionRegex = /@([a-zA-Z0-9_\s]+?)(?=\s|$|,|\.)/g;
  const matches = text.match(mentionRegex);
  return matches ? matches.map(mention => mention.slice(1).trim()) : [];
}

function extractDueDate(text: string): string | null {
  const today = new Date();
  const normalizedText = text.toLowerCase();

  if (normalizedText.includes('due today') || normalizedText.includes('today')) {
    return today.toISOString();
  }

  if (normalizedText.includes('due tomorrow') || normalizedText.includes('tomorrow')) {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString();
  }

  const inDaysMatch = normalizedText.match(/in (\d+) days?/);
  if (inDaysMatch) {
    const days = parseInt(inDaysMatch[1]);
    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + days);
    return futureDate.toISOString();
  }

  const dueDateMatch = normalizedText.match(/due:?\s*(\d{4}-\d{2}-\d{2})/);
  if (dueDateMatch) {
    try {
      return new Date(dueDateMatch[1]).toISOString();
    } catch {
      return null;
    }
  }

  return null;
}

function extractPriority(subject: string, body: string): string {
  const fullText = `${subject} ${body}`.toLowerCase();

  if (
    fullText.includes('urgent') ||
    fullText.includes('asap') ||
    fullText.includes('emergency') ||
    fullText.includes('critical')
  ) {
    return 'urgent';
  }

  if (
    fullText.includes('high priority') ||
    fullText.includes('important')
  ) {
    return 'high';
  }

  if (
    fullText.includes('low priority') ||
    fullText.includes('no rush')
  ) {
    return 'low';
  }

  return 'normal';
}

function detectIsIdea(text: string): boolean {
  const ideaKeywords = [
    'what if',
    'suggestion',
    'idea',
    'could we',
    'should we',
    'would it be possible',
    'feature request',
    'proposal',
  ];

  return ideaKeywords.some(keyword => text.includes(keyword));
}

function detectIsTask(text: string): boolean {
  const taskKeywords = [
    'please',
    'need',
    'required',
    'must',
    'urgent',
    'action item',
    'to do',
    'task',
  ];

  return taskKeywords.some(keyword => text.includes(keyword));
}

function parseEmailContent(subject: string, body: string): ParsedMetadata {
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { sender_email, sender_name, subject, body_text, body_html, attachments } = await req.json();

    if (!sender_email) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: sender_email' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const bodyContent = body_text || body_html || '';
    const parsedMetadata = parseEmailContent(subject || '', bodyContent);

    const { data: emailRecord, error: emailError } = await supabase
      .from('inbound_emails')
      .insert({
        sender_email,
        sender_name: sender_name || '',
        subject: subject || '',
        body_text: body_text || '',
        body_html: body_html || '',
        raw_body: JSON.stringify({ sender_email, sender_name, subject, body_text, body_html }),
        received_at: new Date().toISOString(),
        processing_status: 'pending',
        parsed_metadata: parsedMetadata,
      })
      .select()
      .single();

    if (emailError) {
      console.error('Error inserting email:', emailError);
      return new Response(
        JSON.stringify({ error: 'Failed to store email', details: emailError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (attachments && Array.isArray(attachments)) {
      for (const attachment of attachments) {
        await supabase.from('email_attachments').insert({
          email_id: emailRecord.id,
          filename: attachment.filename || 'unknown',
          file_url: attachment.url || '',
          file_size: attachment.size || 0,
          mime_type: attachment.mime_type || '',
        });
      }
    }

    const senderInfo = {
      name: sender_name || sender_email.split('@')[0],
      email: sender_email,
    };

    const { data: existingPerson } = await supabase
      .from('people')
      .select('*')
      .eq('email', senderInfo.email)
      .maybeSingle();

    if (!existingPerson) {
      await supabase.from('people').insert({
        name: senderInfo.name,
        email: senderInfo.email,
      });
    }

    let createdTaskId = null;
    let createdIdeaId = null;

    if (parsedMetadata.isIdea && !parsedMetadata.isTask) {
      const { data: ideaData, error: ideaError } = await supabase
        .from('ideas')
        .insert({
          title: subject || 'Idea from email',
          description: bodyContent,
          status: 'not_addressed',
          source_email_id: emailRecord.id,
        })
        .select()
        .single();

      if (!ideaError && ideaData) {
        createdIdeaId = ideaData.id;

        if (parsedMetadata.tags.length > 0) {
          for (const tagName of parsedMetadata.tags) {
            const { data: existingTag } = await supabase
              .from('tags')
              .select('id')
              .eq('name', tagName)
              .maybeSingle();

            let tagId = existingTag?.id;

            if (!tagId) {
              const { data: newTag } = await supabase
                .from('tags')
                .insert({ name: tagName, color: '#6B7280' })
                .select('id')
                .single();
              tagId = newTag?.id;
            }

            if (tagId) {
              await supabase.from('idea_tags').insert({
                idea_id: ideaData.id,
                tag_id: tagId,
              });
            }
          }
        }
      }
    } else {
      const priorityToTag: Record<string, string> = {
        urgent: 'Urgent',
        high: 'High Priority',
        low: 'Low Priority',
      };

      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .insert({
          title: subject || 'Task from email',
          description: bodyContent,
          lane: 'red',
          progress_state: 'not_started',
          assignee: parsedMetadata.assignees[0] || senderInfo.name,
          due_date: parsedMetadata.dueDate ? new Date(parsedMetadata.dueDate).toISOString().split('T')[0] : null,
          order_rank: Date.now(),
          source_email_id: emailRecord.id,
        })
        .select()
        .single();

      if (!taskError && taskData) {
        createdTaskId = taskData.id;

        const allTags = [...parsedMetadata.tags];
        if (parsedMetadata.priority && priorityToTag[parsedMetadata.priority]) {
          allTags.push(priorityToTag[parsedMetadata.priority]);
        }

        if (allTags.length > 0) {
          for (const tagName of allTags) {
            const { data: existingTag } = await supabase
              .from('tags')
              .select('id')
              .eq('name', tagName)
              .maybeSingle();

            let tagId = existingTag?.id;

            if (!tagId) {
              const { data: newTag } = await supabase
                .from('tags')
                .insert({ name: tagName, color: '#6B7280' })
                .select('id')
                .single();
              tagId = newTag?.id;
            }

            if (tagId) {
              await supabase.from('task_tags').insert({
                task_id: taskData.id,
                tag_id: tagId,
              });
            }
          }
        }

        await supabase.from('event_log').insert({
          entity_type: 'task',
          entity_id: taskData.id,
          action: 'created',
          changes: { source: 'email', email_id: emailRecord.id },
        });
      }
    }

    await supabase
      .from('inbound_emails')
      .update({
        processing_status: 'processed',
        processed_at: new Date().toISOString(),
        created_task_id: createdTaskId,
        created_idea_id: createdIdeaId,
      })
      .eq('id', emailRecord.id);

    return new Response(
      JSON.stringify({
        success: true,
        email_id: emailRecord.id,
        created_task_id: createdTaskId,
        created_idea_id: createdIdeaId,
        parsed_metadata: parsedMetadata,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error processing email:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});