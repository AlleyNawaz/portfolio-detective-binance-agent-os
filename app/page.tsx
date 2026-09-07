'use client';

import { type SyntheticEvent, useMemo, useState } from 'react';
import { Activity, Bot, Check, ChevronDown, CircleAlert, LoaderCircle, Search, Send, User } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { AgentEvent, InvestigationMode, InvestigationResult } from '@/src/types/portfolio';

const EXAMPLES = ['Investigate why my portfolio changed in the last 24 hours.', 'Which asset caused most of my losses?', 'What affected my portfolio the most?'];

export default function Home() {
  const [mode, setMode] = useState<InvestigationMode>('demo');
  const [input, setInput] = useState('');
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [userMessage, setUserMessage] = useState('');
  const [running, setRunning] = useState(false);
  const result = [...events].reverse().find((item) => item.investigation)?.investigation ?? null;
  const finalMessage = [...events].reverse().find((item) => item.type === 'agent_message')?.message;

  async function investigate(message: string) {
    const trimmed = message.trim();
    if (!trimmed || running) return;
    setUserMessage(trimmed); setInput(''); setEvents([]); setRunning(true);
    try {
      const response = await fetch('/api/agent', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message: trimmed, mode }) });
      if (!response.ok || !response.body) {
        const payload = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(payload.error || 'Agent connection failed.');
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split('\n\n');
        buffer = chunks.pop() || '';
        for (const chunk of chunks) {
          const line = chunk.split('\n').find((candidate) => candidate.startsWith('data: '));
          if (line) setEvents((current) => [...current, JSON.parse(line.slice(6)) as AgentEvent]);
        }
      }
    } catch (error) {
      setEvents((current) => [...current, { id: crypto.randomUUID(), type: 'error', timestamp: new Date().toISOString(), message: error instanceof Error ? error.message : 'Agent connection failed.' }]);
    } finally { setRunning(false); }
  }

  function submit(event: SyntheticEvent<HTMLFormElement>) { event.preventDefault(); void investigate(input); }

  return <main className="min-h-screen bg-[#080a0e] text-[#edf0f4]">
    <header className="border-b border-white/[0.08] bg-[#080a0e]/95"><div className="mx-auto flex max-w-[1500px] items-center justify-between px-5 py-4 md:px-8"><div className="flex items-center gap-3"><div className="grid size-9 place-items-center rounded-lg border border-[#f0b90b]/25 bg-[#f0b90b]/10 text-[#f0b90b]"><Search size={18}/></div><div><h1 className="text-sm font-semibold tracking-tight">Portfolio Detective</h1><p className="text-[11px] text-slate-500">Binance Agent OS investigation agent</p></div></div><div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.03] px-3 py-2"><span className={`size-2 rounded-full ${mode === 'demo' ? 'bg-amber-400' : 'bg-emerald-400'}`}/><span className="text-xs text-slate-300">{mode === 'demo' ? 'Demo mode' : 'Live mode'}</span><Switch checked={mode === 'demo'} onCheckedChange={(checked) => { setMode(checked ? 'demo' : 'live'); setEvents([]); setUserMessage(''); }} aria-label="Toggle demo mode"/></div></div></header>

    <div className="mx-auto grid max-w-[1500px] gap-0 lg:grid-cols-[minmax(0,1fr)_410px]">
      <section className="min-w-0 border-white/[0.08] lg:border-r">
        <div className="mx-auto flex min-h-[calc(100vh-74px)] max-w-4xl flex-col px-5 py-8 md:px-8">
          {!userMessage ? <Welcome onExample={investigate}/> : <Conversation userMessage={userMessage} events={events} running={running} finalMessage={finalMessage}/>}
          <form onSubmit={submit} className="sticky bottom-0 mt-auto pt-8"><div className="rounded-2xl border border-white/10 bg-[#11151c] p-2 shadow-2xl shadow-black/40"><textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void investigate(input); } }} placeholder="Type your investigation request..." rows={2} className="w-full resize-none bg-transparent px-3 py-2 text-sm leading-6 outline-none placeholder:text-slate-600"/><div className="flex items-center justify-between px-2 pb-1"><span className="text-[11px] text-slate-600">Enter to send · Shift Enter for new line</span><button disabled={running || !input.trim()} className="grid size-9 place-items-center rounded-lg bg-[#f0b90b] text-black disabled:cursor-not-allowed disabled:opacity-30" aria-label="Send investigation">{running ? <LoaderCircle size={16} className="animate-spin"/> : <Send size={16}/>}</button></div></div><p className="mt-3 text-center text-[11px] text-slate-600">Analysis only. Not financial advice.</p></form>
        </div>
        {result && <EvidenceDashboard result={result}/>}
      </section>
      <EvidencePanel events={events} mode={mode} running={running}/>
    </div>
  </main>;
}

function Welcome({ onExample }: { onExample: (message: string) => void }) {
  return <div className="flex flex-1 flex-col justify-center py-14"><div className="mb-5 grid size-14 place-items-center rounded-2xl border border-[#f0b90b]/20 bg-[#f0b90b]/10 text-[#f0b90b]"><Bot size={27}/></div><p className="text-xs font-semibold uppercase tracking-[.18em] text-[#f0b90b]">Live agent</p><h2 className="mt-3 max-w-2xl text-4xl font-semibold tracking-[-.04em] md:text-5xl">What do you want to investigate?</h2><p className="mt-4 max-w-xl text-base leading-7 text-slate-400">Ask a natural-language question. The model will choose its own evidence tools and stop when it has enough information.</p><div className="mt-8 grid gap-3 sm:grid-cols-3">{EXAMPLES.map((example) => <button key={example} onClick={() => onExample(example)} className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-4 text-left text-sm leading-6 text-slate-300 transition hover:border-[#f0b90b]/30 hover:bg-[#f0b90b]/[0.04]">{example}</button>)}</div></div>;
}

function Conversation({ userMessage, events, running, finalMessage }: { userMessage: string; events: AgentEvent[]; running: boolean; finalMessage?: string }) {
  const turns = events.filter((item) => item.type === 'agent_thinking').length;
  return <div className="space-y-7 pb-8"><Message speaker="user" text={userMessage}/>{running && !finalMessage && <div className="flex gap-3"><div className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#f0b90b]/10 text-[#f0b90b]"><Bot size={16}/></div><div><p className="mb-2 text-[11px] font-semibold uppercase tracking-[.14em] text-slate-500">Agent</p><div className="flex items-center gap-2 text-sm text-slate-400"><LoaderCircle size={14} className="animate-spin"/>Deciding the next action{turns ? ` · turn ${turns}` : ''}</div></div></div>}{finalMessage && <Message speaker="agent" text={finalMessage}/>} {events.some((item) => item.type === 'error') && <div className="flex gap-3 rounded-xl border border-red-500/20 bg-red-500/[0.05] p-4 text-sm text-red-200"><CircleAlert size={17}/>{events.find((item) => item.type === 'error')?.message}</div>}</div>;
}

function Message({ speaker, text }: { speaker: 'user' | 'agent'; text: string }) { return <div className="flex gap-3"><div className={`grid size-8 shrink-0 place-items-center rounded-lg ${speaker === 'agent' ? 'bg-[#f0b90b]/10 text-[#f0b90b]' : 'bg-white/[0.06] text-slate-400'}`}>{speaker === 'agent' ? <Bot size={16}/> : <User size={16}/>}</div><div className="min-w-0"><p className="mb-2 text-[11px] font-semibold uppercase tracking-[.14em] text-slate-500">{speaker}</p><div className="whitespace-pre-wrap text-[15px] leading-7 text-slate-200">{text}</div></div></div>; }

function EvidencePanel({ events, mode, running }: { events: AgentEvent[]; mode: InvestigationMode; running: boolean }) {
  const activities = useMemo(() => events.filter((item) => item.type.startsWith('tool_call_')), [events]);
  const mcpUsed = activities.some((item) => item.provenance === 'binance-agent-os');
  return <aside className="bg-[#0b0e13] p-5 md:p-7 lg:min-h-[calc(100vh-74px)]"><div className="flex items-center justify-between"><div><p className="text-[11px] font-semibold uppercase tracking-[.16em] text-slate-500">Live investigation</p><h2 className="mt-1 text-lg font-semibold">Tool activity</h2></div>{running && <Activity size={17} className="animate-pulse text-[#f0b90b]"/>}</div><div className="mt-5 space-y-3">{activities.length ? activities.map((item) => <ToolEvent key={item.id} event={item}/>) : <div className="rounded-xl border border-dashed border-white/10 p-5 text-sm leading-6 text-slate-600">Tool calls appear here only after the backend agent actually requests them.</div>}</div><div className="mt-8 border-t border-white/[0.08] pt-6"><p className="text-[11px] font-semibold uppercase tracking-[.16em] text-slate-500">Binance Agent OS connection</p><div className="mt-4 space-y-3 text-xs"><Status label="Official MCP" value={mcpUsed ? 'Used in this investigation' : 'Not used in this investigation'} active={mcpUsed}/><Status label="Data mode" value={mode === 'demo' ? 'Simulated evidence' : 'Binance Spot API'} active={mode === 'live'}/><Status label="MCP endpoint" value="agent.binance.com/mcp/agentic" active={mcpUsed}/></div><p className="mt-4 text-[11px] leading-5 text-slate-600">The official MCP is exposed to the model only when a server-side OAuth access token is configured. Binance API-backed local tools are labeled separately.</p></div></aside>;
}

function ToolEvent({ event }: { event: AgentEvent }) { const running = event.type === 'tool_call_started'; const failed = event.type === 'tool_call_failed'; return <details className="group rounded-xl border border-white/[0.08] bg-white/[0.025] p-4"><summary className="flex cursor-pointer list-none items-center gap-3"><div className={`grid size-8 place-items-center rounded-lg ${failed ? 'bg-red-500/10 text-red-400' : running ? 'bg-[#f0b90b]/10 text-[#f0b90b]' : 'bg-emerald-400/10 text-emerald-400'}`}>{running ? <LoaderCircle size={15} className="animate-spin"/> : failed ? <CircleAlert size={15}/> : <Check size={15}/>}</div><div className="min-w-0 flex-1"><p className="truncate font-mono text-xs text-slate-200">{event.tool}</p><p className="mt-1 text-[10px] uppercase tracking-[.12em] text-slate-600">{labelProvenance(event.provenance)} · {new Date(event.timestamp).toLocaleTimeString()}</p></div><ChevronDown size={14} className="text-slate-600 transition group-open:rotate-180"/></summary><div className="mt-4 space-y-3 border-t border-white/[0.07] pt-3"><JsonBlock label="Input" value={event.input}/>{event.result !== undefined && <JsonBlock label="Result" value={event.result}/>}</div></details>; }
function JsonBlock({ label, value }: { label: string; value: unknown }) { return <div><p className="mb-1 text-[10px] uppercase tracking-[.12em] text-slate-600">{label}</p><pre className="max-h-48 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-black/30 p-3 text-[10px] leading-5 text-slate-400">{JSON.stringify(value ?? {}, null, 2)}</pre></div>; }
function Status({ label, value, active }: { label: string; value: string; active: boolean }) { return <div className="flex items-start justify-between gap-4"><span className="text-slate-500">{label}</span><span className={`text-right ${active ? 'text-emerald-400' : 'text-slate-300'}`}>{value}</span></div>; }

function EvidenceDashboard({ result }: { result: InvestigationResult }) { return <div className="border-t border-white/[0.08] bg-[#0b0e13] px-5 py-10 md:px-8"><div className="mx-auto max-w-6xl"><p className="text-[11px] font-semibold uppercase tracking-[.16em] text-[#f0b90b]">Calculated evidence</p><h2 className="mt-2 text-2xl font-semibold">Portfolio contribution ledger</h2><div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><Metric label="Current value" value={money(result.currentPortfolioValue)}/><Metric label="Movement" value={signedMoney(result.totalChange)} negative={result.totalChange < 0}/><Metric label="Largest positive" value={result.largestPositiveContributor?.symbol || 'None'}/><Metric label="Largest negative" value={result.largestNegativeContributor?.symbol || 'None'}/><Metric label="Largest absolute" value={result.overallMainContributor?.symbol || 'None'}/></div><div className="mt-5 overflow-hidden rounded-xl border border-white/[0.08]"><Table><TableHeader><TableRow><TableHead>Asset</TableHead><TableHead>Quantity</TableHead><TableHead>Previous</TableHead><TableHead>Current</TableHead><TableHead>Impact</TableHead><TableHead>Contribution</TableHead></TableRow></TableHeader><TableBody>{result.assets.map((asset) => <TableRow key={asset.symbol}><TableCell className="font-semibold">{asset.symbol}</TableCell><TableCell>{asset.quantity}</TableCell><TableCell>{money(asset.previousPrice)}</TableCell><TableCell>{money(asset.currentPrice)}</TableCell><TableCell className={asset.dollarChange < 0 ? 'text-red-400' : 'text-emerald-400'}>{signedMoney(asset.dollarChange)}</TableCell><TableCell>{pct(result.contributionBasis === 'gross' ? asset.grossContributionPercentage : asset.netContributionPercentage)}</TableCell></TableRow>)}</TableBody></Table></div>{result.caveat && <p className="mt-4 text-xs leading-5 text-amber-200/70">{result.caveat}</p>}</div></div>; }
function Metric({ label, value, negative }: { label: string; value: string; negative?: boolean }) { return <div className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-4"><p className="text-[10px] uppercase tracking-[.12em] text-slate-600">{label}</p><p className={`mt-2 text-lg font-semibold ${negative ? 'text-red-400' : 'text-slate-100'}`}>{value}</p></div>; }
const money = (value: number) => value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
const signedMoney = (value: number) => `${value > 0 ? '+' : value < 0 ? '-' : ''}${money(Math.abs(value))}`;
const pct = (value: number | null) => value === null ? 'N/A' : `${value.toFixed(2)}%`;
const labelProvenance = (value?: string) => value === 'binance-agent-os' ? 'Binance Agent OS' : value === 'binance-api-local' ? 'Binance API local tool' : 'Local tool';
