import { NextRequest } from 'next/server';
import { polzaChatCompletion } from '@/lib/polzaClient';
import { supabaseAdmin, validateTableName } from '@/lib/supabaseAdmin';

type ChatRole = 'system' | 'user' | 'assistant' | 'tool';

type ChatMessage = {
  role: ChatRole;
  content: string;
  name?: string;
  tool_call_id?: string;
  tool_calls?: unknown[];
};

type SelectFilter = {
  column: string;
  op: string;
  value: unknown;
};

type SelectInput = {
  table: string;
  columns?: string;
  filters?: SelectFilter[];
  order?: { column: string; ascending: boolean };
  limit?: number;
};

const SYSTEM_PROMPT = `Ты ассистент в приложении с чатом и Supabase. Если пользователь просит показать данные, таблицу, записи, выборку, выгрузку или упоминает таблицы/колонки, ты ОБЯЗАН вызвать инструмент supabase_select и не выдумывать данные. Если данных не запрашивают, отвечай обычным текстом.`;

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'supabase_select',
      description: 'Select rows from Supabase table for trusted server-side querying',
      parameters: {
        type: 'object',
        properties: {
          table: { type: 'string' },
          columns: { type: 'string', description: 'Comma-separated column list' },
          filters: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                column: { type: 'string' },
                op: { type: 'string' },
                value: {}
              },
              required: ['column', 'op', 'value']
            }
          },
          order: {
            type: 'object',
            properties: {
              column: { type: 'string' },
              ascending: { type: 'boolean' }
            },
            required: ['column', 'ascending']
          },
          limit: { type: 'number' }
        },
        required: ['table']
      }
    }
  }
];

async function runSupabaseSelect(input: SelectInput) {
  try {
    const table = validateTableName(input.table);
    const columns = input.columns && input.columns.trim() ? input.columns : '*';
    let query = supabaseAdmin.from(table).select(columns);

    for (const filter of input.filters ?? []) {
      switch (filter.op) {
        case 'eq':
          query = query.eq(filter.column, filter.value);
          break;
        case 'neq':
          query = query.neq(filter.column, filter.value);
          break;
        case 'gt':
          query = query.gt(filter.column, filter.value);
          break;
        case 'gte':
          query = query.gte(filter.column, filter.value);
          break;
        case 'lt':
          query = query.lt(filter.column, filter.value);
          break;
        case 'lte':
          query = query.lte(filter.column, filter.value);
          break;
        case 'like':
          query = query.like(filter.column, String(filter.value));
          break;
        case 'ilike':
          query = query.ilike(filter.column, String(filter.value));
          break;
        case 'in':
          query = query.in(filter.column, Array.isArray(filter.value) ? filter.value : [filter.value]);
          break;
        default:
          return { ok: false, error: `Unsupported filter op: ${filter.op}` };
      }
    }

    if (input.order?.column) {
      query = query.order(input.order.column, { ascending: input.order.ascending });
    }

    if (input.limit && Number.isFinite(input.limit)) {
      query = query.limit(Math.min(Math.max(input.limit, 1), 100));
    }

    const { data, error } = await query;

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true, data: data ?? [] };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown Supabase error';
    return { ok: false, error: message };
  }
}

async function parseCompletionJson(response: Response) {
  const payload = await response.json();
  return payload?.choices?.[0]?.message;
}

function streamPolzaText(response: Response, tablePayload: unknown[] | null) {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  return new ReadableStream({
    async start(controller) {
      if (!response.body) {
        controller.close();
        return;
      }

      const reader = response.body.getReader();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split('\n\n');
          buffer = events.pop() ?? '';

          for (const event of events) {
            const line = event.split('\n').find((entry) => entry.startsWith('data: '));
            if (!line) continue;

            const json = line.slice(6).trim();
            if (json === '[DONE]') {
              if (tablePayload) {
                controller.enqueue(
                  encoder.encode(`\n\n\`\`\`supabase-data\n${JSON.stringify(tablePayload)}\n\`\`\``)
                );
              }
              controller.close();
              return;
            }

            const parsed = JSON.parse(json);
            const token = parsed?.choices?.[0]?.delta?.content;
            if (token) controller.enqueue(encoder.encode(token));
          }
        }

        if (tablePayload) {
          controller.enqueue(encoder.encode(`\n\n\`\`\`supabase-data\n${JSON.stringify(tablePayload)}\n\`\`\``));
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    }
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const messages: ChatMessage[] = Array.isArray(body.messages) ? body.messages : [];

    const seedMessages: ChatMessage[] = [{ role: 'system', content: SYSTEM_PROMPT }, ...messages];

    const firstPass = await polzaChatCompletion({
      model: process.env.POLZA_MODEL ?? 'gpt-4o-mini',
      messages: seedMessages,
      tools: TOOLS,
      tool_choice: 'auto',
      stream: false,
      temperature: 0.2
    });

    const assistantMessage = await parseCompletionJson(firstPass);
    const toolCalls = assistantMessage?.tool_calls ?? [];

    const withTools: ChatMessage[] = [...seedMessages];
    let tablePayload: unknown[] | null = null;

    if (assistantMessage?.content || toolCalls.length > 0) {
      withTools.push({
        role: 'assistant',
        content: assistantMessage?.content ?? '',
        ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {})
      });
    }

    for (const call of toolCalls) {
      if (call?.function?.name !== 'supabase_select') continue;

      let args: SelectInput = { table: '' };
      try {
        args = JSON.parse(call.function.arguments ?? '{}');
      } catch {
        args = { table: '' };
      }

      const toolResult = await runSupabaseSelect(args);
      if (toolResult.ok && Array.isArray(toolResult.data)) {
        tablePayload = toolResult.data;
      }

      withTools.push({
        role: 'tool',
        tool_call_id: call.id,
        name: 'supabase_select',
        content: JSON.stringify(toolResult)
      });
    }

    const finalResponse = await polzaChatCompletion({
      model: process.env.POLZA_MODEL ?? 'gpt-4o-mini',
      messages: withTools,
      stream: true,
      temperature: 0.2
    });

    const stream = streamPolzaText(finalResponse, tablePayload);

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive'
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown server error';
    return Response.json({ error: message }, { status: 500 });
  }
}
