import 'server-only';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { z } from 'zod';
import { runAsMember } from '../current-user';
import { isSupabaseConfigured } from '../supabase';
import { authenticate, isRateLimited, type CallerContext } from './connections';
import { inputShape, pickUpTaskPrompt, runTool, toolsFor } from './tools';

// The MCP endpoint. Stateless: every request builds a fresh server for its caller, so it
// works on serverless hosting with no sessions to keep.

const INSTRUCTIONS = `Vibe Tracker is a Kanban board for vibecoding work. Each task stores AI context (background, constraints, what was tried, where to pick up) and the prompts that produced it.
Start with list_projects, then get_board for a project. Tasks are referred to as CODE-number (e.g. DEMO-3), the same numbering as the board.
Columns are todo, in-progress, review and done. Blocked tasks can't move to review or done unless force is true.
If this connection can write: after working on a task, update its context with update_context and record your prompts with log_prompt.
Outcomes (whether a prompt or context worked, and why) are a human judgement. Read them with get_outcomes. Only call record_outcome when the person explicitly tells you to, passing their exact words; it works on the Demo Board only.`;

function createServer(ctx: CallerContext) {
  const server = new McpServer({ name: 'vibe-tracker', version: '1.0.0' }, { instructions: INSTRUCTIONS });

  for (const tool of toolsFor(ctx)) {
    server.registerTool(
      tool.name,
      {
        title: tool.title,
        description: tool.description,
        inputSchema: inputShape(tool.name),
        annotations: {
          readOnlyHint: !tool.write,
          destructiveHint: tool.name === 'update_context',
          idempotentHint: !tool.write || tool.name.startsWith('move_') || tool.name === 'hand_off_task',
          openWorldHint: false,
        },
      },
      async (args: unknown) => {
        const result = await runTool(tool.name, args, ctx);
        return { content: [{ type: 'text' as const, text: result.text }], isError: !result.ok };
      },
    );
  }

  server.registerPrompt(
    'pick_up_task',
    {
      title: 'Pick up a task',
      description: 'Load a task with its context, blockers and prompt history, and continue the work.',
      argsSchema: { task: z.string().describe('Task reference like DEMO-3.') },
    },
    async ({ task }) => {
      let text: string;
      try {
        text = await pickUpTaskPrompt(task, ctx);
      } catch (err) {
        text = `Couldn't load task ${task}: ${(err as Error).message}`;
      }
      return { messages: [{ role: 'user' as const, content: { type: 'text' as const, text } }] };
    },
  );
  return server;
}

function jsonError(status: number, message: string) {
  return Response.json({ jsonrpc: '2.0', error: { code: -32001, message }, id: null }, { status });
}

/** Handle one MCP HTTP request for the connection behind `secret`. */
export async function handleMcpRequest(req: Request, secret: string | null): Promise<Response> {
  // Stateless JSON only: no server-sent event stream to open with GET (it would just hang on serverless hosting).
  if (req.method === 'GET') return new Response('Method not allowed: send MCP requests with POST.', { status: 405, headers: { allow: 'POST, DELETE' } });
  if (!isSupabaseConfigured()) return jsonError(503, 'The tracker is not configured yet.');
  const ctx = secret ? await authenticate(secret) : null;
  if (!ctx) {
    return jsonError(401, 'This connection is invalid, expired or revoked. Create a new one on the Connect an AI page of Vibe Tracker.');
  }
  if (ctx.connectionId && (await isRateLimited(ctx.connectionId))) {
    return jsonError(429, 'Too many requests from this connection. Wait a minute and try again.');
  }

  // Everything below runs as the member who created the connection.
  const handle = async () => {
    const server = createServer(ctx);
    const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    await server.connect(transport);
    try {
      return await transport.handleRequest(req);
    } finally {
      // The JSON response is complete once handleRequest resolves.
      void server.close();
    }
  };
  if (!ctx.memberId) return jsonError(401, "This connection's owner no longer exists. Create a new connection on the Connect an AI page.");
  return runAsMember(ctx.memberId, handle);
}
