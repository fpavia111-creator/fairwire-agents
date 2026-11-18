import { fileURLToPath } from 'node:url';
// MCP interop check. Drives every agent through the OFFICIAL MCP SDK client over real
// stdio (the way Claude Desktop, Claude Code and Cursor connect), and checks what a
// model sees: spec-valid tool names, schemas that compile, a description on every
// argument, annotations, prompts, output schemas, and that every tool called with {}
// comes back as a tool result rather than a protocol error.
//
//   npm i --no-save @modelcontextprotocol/sdk ajv ajv-formats
//   npm run mcp:check                 # all agents
//   npm run mcp:check -- polaris-of-bills spica-of-fuel
//
// Exit code 1 when any agent has a hard issue. Writes mcp-conformance.json.
import { readdirSync, readFileSync, mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

let Client, StdioClientTransport, LATEST_PROTOCOL_VERSION, Ajv2020, addFormats;
try {
  ({ Client } = await import('@modelcontextprotocol/sdk/client/index.js'));
  ({ StdioClientTransport } = await import('@modelcontextprotocol/sdk/client/stdio.js'));
  ({ LATEST_PROTOCOL_VERSION } = await import('@modelcontextprotocol/sdk/types.js'));
  Ajv2020 = (await import('ajv/dist/2020.js')).default;
  addFormats = (await import('ajv-formats')).default;
} catch {
  console.error('mcp:check needs the official MCP SDK client (test-only, not shipped):\n  npm i --no-save @modelcontextprotocol/sdk ajv ajv-formats');
  process.exit(2);
}

const root = fileURLToPath(new URL('..', import.meta.url));
const only = process.argv.slice(2);
const pk = join(root, 'packages');
const agents = readdirSync(pk).filter((d) => d !== 'fairwire-core' && (!only.length || only.includes(d)));
const NAME_RE = /^[A-Za-z0-9_.-]{1,128}$/;
const report = [];

for (const a of agents) {
  const pkg = JSON.parse(readFileSync(join(pk, a, 'package.json'), 'utf8'));
  const bin = join(pk, a, Object.values(pkg.bin)[0]);
  const cwd = mkdtempSync(join(tmpdir(), `mcp-${a}-`));
  const issues = [];
  const r = { agent: a, issues };
  const transport = new StdioClientTransport({ command: process.execPath, args: [bin, 'mcp'], cwd, stderr: 'pipe' });
  const client = new Client({ name: 'conformance', version: '1.0.0' }, { capabilities: {} });
  try {
    const t0 = Date.now();
    await client.connect(transport);
    r.init_ms = Date.now() - t0;
    r.protocol = transport._protocolVersion || client.getServerVersion() && 'ok';
    const caps = client.getServerCapabilities();
    r.instructions_chars = (client.getInstructions() || '').length;
    await client.ping();
    const { tools } = await client.listTools();
    r.tools = tools.length;
    const listJson = JSON.stringify(tools);
    r.tools_list_tokens_est = Math.round(listJson.length / 4);
    r.model_tokens_est = Math.round(JSON.stringify(tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.inputSchema }))).length / 4);
    const ajv = new Ajv2020({ strict: false, allErrors: true }); addFormats(ajv);
    for (const t of tools) {
      if (!NAME_RE.test(t.name)) issues.push(`tool name not spec-valid: ${t.name}`);
      if (!t.inputSchema || t.inputSchema.type !== 'object') issues.push(`${t.name}: inputSchema.type must be "object"`);
      try { ajv.compile(t.inputSchema); } catch (e) { issues.push(`${t.name}: inputSchema does not compile: ${e.message}`); }
      if (t.outputSchema) try { ajv.compile(t.outputSchema); } catch (e) { issues.push(`${t.name}: outputSchema does not compile: ${e.message}`); }
      if (!t.annotations) issues.push(`${t.name}: no annotations`);
      if (!t.description || t.description.length < 20) issues.push(`${t.name}: description too short`);
      const props = (t.inputSchema && t.inputSchema.properties) || {};
      for (const [k, s] of Object.entries(props)) if (!s.description) issues.push(`${t.name}.${k}: argument has no description`);
    }
    r.with_output_schema = tools.filter((t) => t.outputSchema).length;
    if (caps.prompts) { const { prompts } = await client.listPrompts(); r.prompts = prompts.length; for (const p of prompts) { try { const args = Object.fromEntries((p.arguments || []).map((x) => [x.name, 'x'])); await client.getPrompt({ name: p.name, arguments: args }); } catch (e) { issues.push(`prompt ${p.name}: ${e.message}`); } } }
    const info = await client.callTool({ name: 'fairwire_info', arguments: {} });
    if (info.isError || !info.structuredContent) issues.push('fairwire_info: error or no structuredContent');
    // Every tool called with {}: must come back as a tool result (never a protocol crash).
    const sizes = [];
    for (const t of tools) {
      try {
        const res = await client.callTool({ name: t.name, arguments: {} });
        const txt = (res.content || []).map((c) => c.text || '').join('');
        sizes.push([t.name, txt.length, JSON.stringify(res.structuredContent || {}).length]);
        if (res.isError && !/required|argument|invalid|approval|licen|block|missing|not found|no such|give|pass|no request/i.test(txt)) issues.push(`${t.name}({}): error without an actionable reason: ${txt.slice(0, 120)}`);
      } catch (e) { issues.push(`${t.name}({}): protocol error ${e.code ?? ''} ${e.message.slice(0, 160)}`); }
    }
    r.text_vs_structured = sizes.reduce((s, x) => s + x[1], 0) + '/' + sizes.reduce((s, x) => s + x[2], 0);
    try { const u = await client.callTool({ name: 'no_such_tool_xyz', arguments: {} }); r.unknown_tool = u.isError ? 'isError result' : 'NOT an error'; if (!u.isError) issues.push('unknown tool did not return an error'); }
    catch (e) { r.unknown_tool = `protocol error ${e.code}`; }
  } catch (e) {
    issues.push(`FATAL: ${e.message}`);
  } finally {
    try { await client.close(); } catch {}
  }
  report.push(r);
  process.stderr.write(`${a}: ${issues.length} issue(s)\n`);
}
writeFileSync(process.env.OUT || 'mcp-conformance.json', JSON.stringify({ sdk_latest_protocol: LATEST_PROTOCOL_VERSION, report }, null, 2));
const bad = report.filter((x) => x.issues.length);
console.log(`agents: ${report.length}, with issues: ${bad.length}, total tools: ${report.reduce((s, x) => s + (x.tools || 0), 0)}`);
const hard = report.flatMap((x) => x.issues.filter((i) => !/without an actionable reason/.test(i)));
if (hard.length) { console.log(hard.join('\n')); process.exit(1); }
