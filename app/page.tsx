'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Check, Circle, Database, Fingerprint, LoaderCircle, Search, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { InvestigationMode, InvestigationProgress, InvestigationResult } from '@/src/types/portfolio';

const INITIAL_STEPS: InvestigationProgress[] = [
  { id: 'portfolio', label: 'Portfolio evidence collected', status: 'pending' },
  { id: 'market', label: 'Market data retrieved', status: 'pending' },
  { id: 'calculate', label: 'Portfolio movement calculated', status: 'pending' },
  { id: 'contributors', label: 'Contributors identified', status: 'pending' },
  { id: 'report', label: 'Detective report generated', status: 'pending' },
];

export default function Home() {
  const [mode, setMode] = useState<InvestigationMode>('demo');
  const [steps, setSteps] = useState(INITIAL_STEPS);
  const [result, setResult] = useState<InvestigationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const startInvestigation = useCallback(async (requestedMode: unknown = mode) => {
    const effectiveMode: InvestigationMode = requestedMode === 'demo' || requestedMode === 'live' ? requestedMode : mode;
    setRunning(true); setResult(null); setError(null);
    setSteps(INITIAL_STEPS.map((step, index) => ({ ...step, status: index === 0 ? 'active' : 'pending' })));
    try {
      const response = await fetch('/api/investigate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mode: effectiveMode }) });
      const payload = (await response.json()) as InvestigationResult | { error: string };
      if (!response.ok || 'error' in payload) throw new Error('error' in payload ? payload.error : 'Investigation failed.');
      setSteps(INITIAL_STEPS.map((step) => ({ ...step, status: 'complete' })));
      setResult(payload as InvestigationResult);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Investigation paused. Please try again.');
      setSteps((current) => current.map((step) => step.status === 'active' ? { ...step, status: 'error' } : step));
    } finally { setRunning(false); }
  }, [mode]);

  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    void Promise.resolve(context.registerTool({
      name: 'investigate_portfolio',
      title: 'Investigate portfolio',
      description: 'Run the same read-only portfolio investigation shown in the dashboard using Demo or Live Mode.',
      inputSchema: { type: 'object', properties: { mode: { type: 'string', enum: ['demo', 'live'] } }, required: ['mode'], additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      async execute(input: unknown) {
        const candidate = input as { mode?: unknown };
        if (candidate.mode !== 'demo' && candidate.mode !== 'live') throw new Error('Mode must be demo or live.');
        setMode(candidate.mode);
        await startInvestigation(candidate.mode);
        return { status: 'complete', mode: candidate.mode };
      },
    }, { signal: lifecycle.signal })).catch((registrationError: unknown) => console.warn('[WebMCP] registration unavailable', registrationError));
    return () => lifecycle.abort();
  }, [startInvestigation]);

  return <main className="min-h-screen bg-[#07090d] text-[#f4f7f9]">
    <div className="noise" />
    <header className="sticky top-0 z-20 border-b border-white/[0.07] bg-[#07090d]/85 backdrop-blur-xl"><div className="mx-auto flex max-w-[1440px] items-center justify-between gap-6 px-5 py-4 md:px-10"><div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-xl border border-[#f0b90b]/30 bg-[#f0b90b]/10 text-[#f0b90b]"><Search size={20} /></div><div><p className="font-display text-[17px] font-semibold tracking-tight">Portfolio Detective</p><p className="text-xs text-slate-500">AI-powered portfolio investigation</p></div></div><div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.03] px-3 py-2"><span className={`size-2 rounded-full ${mode === 'demo' ? 'bg-[#f0b90b]' : 'bg-emerald-400'} shadow-[0_0_12px_currentColor]`} /><span className="hidden text-xs font-medium text-slate-300 sm:block">{mode === 'demo' ? 'Demo connected' : 'Live credentials'}</span><Switch aria-label="Toggle Demo Mode" checked={mode === 'demo'} onCheckedChange={(checked) => { setMode(checked ? 'demo' : 'live'); setResult(null); setError(null); }} className="data-checked:bg-[#f0b90b]" /></div></div></header>
    <div className="mx-auto grid max-w-[1440px] gap-6 px-5 py-7 md:px-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:py-10"><section className="min-w-0"><div className="relative overflow-hidden rounded-[28px] border border-white/[0.08] bg-[#0d1118] px-6 py-9 md:px-10 md:py-11"><div className="evidence-grid" /><div className="relative max-w-3xl"><div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#f0b90b]/20 bg-[#f0b90b]/[0.07] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-[#f0b90b]"><Fingerprint size={14} /> Case file · 24H movement</div><h1 className="font-display max-w-2xl text-4xl font-semibold leading-[1.03] tracking-[-0.045em] md:text-6xl">What happened to your portfolio?</h1><p className="mt-5 max-w-xl text-base leading-7 text-slate-400">Trace every dollar of movement. Portfolio Detective compares holdings, weighs each asset’s impact, and closes the case with evidence.</p><div className="mt-8 flex flex-wrap items-center gap-4"><Button size="lg" disabled={running} onClick={startInvestigation} className="h-12 rounded-xl bg-[#f0b90b] px-5 text-[15px] font-bold text-[#090b0f] shadow-[0_12px_40px_rgba(240,185,11,.18)] hover:bg-[#ffd43b]">{running ? <LoaderCircle className="animate-spin" /> : <Search />} {running ? 'Investigating…' : 'Start Investigation'}</Button><div className="flex items-center gap-2 text-sm text-slate-500"><ShieldCheck size={16} className="text-emerald-400" /> Read-only analysis</div></div></div></div>
    {mode === 'demo' && <div className="mt-4 flex items-start gap-3 rounded-xl border border-[#f0b90b]/20 bg-[#f0b90b]/[0.05] px-4 py-3 text-sm text-[#d8c37c]"><Database size={17} className="mt-0.5 shrink-0" /><span><strong>Demo Mode Active</strong> — portfolio holdings and market evidence are fixed sample data for demonstration.</span></div>}{mode === 'live' && <div className="mt-4 flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.05] px-4 py-3 text-sm text-emerald-200"><ShieldCheck size={17} className="mt-0.5 shrink-0" /><span><strong>Live Mode</strong> — reads Binance Spot balances and public market data using server-side environment credentials.</span></div>}{error && <div role="alert" className="mt-4 flex items-start gap-3 rounded-xl border border-red-500/25 bg-red-500/[0.06] px-4 py-3 text-sm text-red-200"><AlertTriangle size={17} className="mt-0.5 shrink-0" />{error}</div>}{result ? <Results result={result} /> : <EmptyEvidence />}</section>
    <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start"><div className="rounded-2xl border border-white/[0.08] bg-[#0d1118] p-5"><div className="mb-5 flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Investigation log</p><h2 className="mt-1 font-display text-xl font-semibold">Evidence trail</h2></div><div className={`grid size-9 place-items-center rounded-full ${result ? 'bg-emerald-400/10 text-emerald-400' : 'bg-white/5 text-slate-500'}`}>{result ? <Check size={18} /> : <Search size={18} />}</div></div><div className="space-y-1">{steps.map((step, index) => <ProgressStep key={step.id} step={step} last={index === steps.length - 1} />)}</div></div><div className="rounded-2xl border border-white/[0.08] bg-[#0d1118] p-5"><div className="flex items-center gap-2 text-[#f0b90b]"><Sparkles size={16} /><span className="text-xs font-semibold uppercase tracking-[0.14em]">Agent OS</span></div><p className="mt-3 text-sm leading-6 text-slate-400">The bundled <code className="text-slate-200">portfolio-detective</code> skill lets compatible AI agents run this exact evidence engine, then narrate only the structured result.</p><div className="mt-4 rounded-lg bg-black/30 px-3 py-2 font-mono text-xs text-slate-400">npm run agent:investigate -- --demo</div></div></aside></div>
  </main>;
}

function ProgressStep({ step, last }: { step: InvestigationProgress; last: boolean }) { return <div className="relative flex gap-3 pb-5 last:pb-0">{!last && <span className="absolute left-[10px] top-6 h-[calc(100%-18px)] w-px bg-white/10" />}<div className={`relative z-10 mt-0.5 grid size-[21px] shrink-0 place-items-center rounded-full border ${step.status === 'complete' ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-400' : step.status === 'active' ? 'border-[#f0b90b]/50 bg-[#f0b90b]/10 text-[#f0b90b]' : step.status === 'error' ? 'border-red-400/50 bg-red-400/10 text-red-400' : 'border-white/10 bg-[#0d1118] text-slate-700'}`}>{step.status === 'complete' ? <Check size={12} /> : step.status === 'active' ? <LoaderCircle size={12} className="animate-spin" /> : <Circle size={8} />}</div><p className={`text-sm ${step.status === 'complete' ? 'text-slate-200' : step.status === 'active' ? 'text-[#f0b90b]' : 'text-slate-600'}`}>{step.label}</p></div>; }
function EmptyEvidence() { return <div className="mt-6 grid min-h-52 place-items-center rounded-2xl border border-dashed border-white/10 bg-white/[0.015] px-6 text-center"><div><div className="mx-auto grid size-12 place-items-center rounded-2xl bg-white/[0.04] text-slate-600"><Fingerprint /></div><p className="mt-4 font-medium text-slate-300">No case opened yet</p><p className="mt-1 text-sm text-slate-600">Start an investigation to reveal the evidence.</p></div></div>; }

function Results({ result }: { result: InvestigationResult }) { const main = result.overallMainContributor; return <section className="mt-6 space-y-5" aria-live="polite"><div className="flex items-center gap-3"><div className="rounded-md bg-emerald-400/10 px-2.5 py-1 text-xs font-bold uppercase tracking-[0.16em] text-emerald-400">Case closed</div><div className="h-px flex-1 bg-gradient-to-r from-emerald-400/20 to-transparent" /></div><div className="grid gap-4 sm:grid-cols-3"><Metric label="Total portfolio value" value={currency(result.currentPortfolioValue)} /><Metric label="Portfolio change" value={signedCurrency(result.totalChange)} detail={percent(result.portfolioChangePercentage)} tone={result.totalChange < 0 ? 'negative' : 'positive'} /><Metric label="Main contributor" value={main?.symbol ?? 'No material move'} detail={main ? `${signedCurrency(main.dollarChange)} impact` : undefined} tone={main && main.dollarChange < 0 ? 'negative' : 'positive'} /></div><div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d1118]"><div className="border-b border-white/[0.07] px-5 py-4"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Asset evidence</p><h2 className="mt-1 font-display text-xl font-semibold">Contribution ledger</h2></div><Table><TableHeader><TableRow className="border-white/[0.07] hover:bg-transparent"><TableHead>Asset</TableHead><TableHead>Quantity</TableHead><TableHead>Previous</TableHead><TableHead>Current</TableHead><TableHead>Price change</TableHead><TableHead>Impact</TableHead><TableHead>Contribution</TableHead></TableRow></TableHeader><TableBody>{result.assets.map((asset) => <TableRow key={asset.symbol} className="border-white/[0.06] hover:bg-white/[0.025]"><TableCell className="font-bold text-white">{asset.symbol}<span className="ml-2 text-xs font-normal text-slate-600">{asset.allocationPercentage?.toFixed(1)}%</span></TableCell><TableCell>{asset.quantity}</TableCell><TableCell>{currency(asset.previousPrice)}</TableCell><TableCell>{currency(asset.currentPrice)}</TableCell><TableCell className={tone(asset.priceChangePercentage ?? 0)}>{percent(asset.priceChangePercentage)}</TableCell><TableCell className={`font-semibold ${tone(asset.dollarChange)}`}>{signedCurrency(asset.dollarChange)}</TableCell><TableCell>{result.contributionBasis === 'gross' ? percent(asset.grossContributionPercentage) : percent(asset.netContributionPercentage)}</TableCell></TableRow>)}</TableBody></Table><div className="border-t border-white/[0.07] px-5 py-3 text-xs text-slate-500">Contribution basis: {result.contributionBasis === 'gross' ? 'gross absolute movement' : result.contributionBasis === 'net' ? 'net portfolio movement' : 'unavailable'}. Prices use {result.assets[0]?.comparisonLabel.toLowerCase()}.</div></div><div className="relative overflow-hidden rounded-2xl border border-[#f0b90b]/15 bg-[#f0b90b]/[0.035] p-6"><Search className="absolute -right-5 -top-7 size-32 text-[#f0b90b]/[0.035]" /><div className="relative"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#f0b90b]">Detective summary</p><p className="mt-3 max-w-3xl text-[15px] leading-7 text-slate-300">{result.summary}</p>{result.caveat && <p className="mt-3 border-l-2 border-[#f0b90b]/40 pl-3 text-sm leading-6 text-[#d8c37c]">{result.caveat}</p>}</div></div></section>; }
function Metric({ label, value, detail, tone: valueTone }: { label: string; value: string; detail?: string; tone?: 'positive' | 'negative' }) { return <div className="rounded-2xl border border-white/[0.08] bg-[#0d1118] p-5"><p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">{label}</p><p className={`mt-3 font-display text-2xl font-semibold tracking-tight ${valueTone === 'negative' ? 'text-red-400' : valueTone === 'positive' ? 'text-emerald-400' : 'text-white'}`}>{value}</p>{detail && <p className="mt-1 text-sm text-slate-500">{detail}</p>}</div>; }
const currency = (value: number) => value.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const signedCurrency = (value: number) => `${value > 0 ? '+' : value < 0 ? '-' : ''}${currency(Math.abs(value))}`;
const percent = (value: number | null) => value === null ? 'N/A' : `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
const tone = (value: number) => value < 0 ? 'text-red-400' : value > 0 ? 'text-emerald-400' : 'text-slate-400';
