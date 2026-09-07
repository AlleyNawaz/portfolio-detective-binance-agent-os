# Portfolio Detective 🔍

Portfolio Detective is an AI-ready crypto portfolio investigation agent built for Binance Agent OS Mini Hackathon — Track A. It answers a practical question: *what actually moved my portfolio?*

Instead of asking a language model to do financial arithmetic, the project collects portfolio and price evidence, runs a deterministic TypeScript calculation engine, and gives the Agent OS skill a structured case file to explain.

## What It Does

- Calculates previous and current portfolio value
- Attributes dollar impact to every asset
- Detects the largest positive, negative, and absolute contributor
- Handles mixed-direction assets without misleading net percentages
- Produces an evidence-grounded detective summary
- Runs with reproducible sample evidence or a read-only Binance Spot account
- Includes a polished responsive dashboard and an installable Agent OS skill

## Why It Was Built

Crypto users can see that a portfolio moved, but the total does not immediately reveal which holdings mattered. Portfolio Detective turns balances and market prices into an auditable contribution ledger and a clear explanation.

## How It Works

```text
Portfolio holdings → Binance market evidence → Deterministic calculation engine
→ Contribution analysis → Binance Agent OS skill → Investigation report
```

The dashboard calls the same investigation service used by the command-line agent tool. Demo Mode uses fixed, visibly labelled holdings and prices. Live Mode reads Binance Spot holdings plus current and previous market prices.

## Binance Agent OS Integration

Binance's official documentation describes Agent OS as a broader toolkit that includes Binance APIs, Skills Hub, and the Binance MCP server. It does **not** document a package named “Binance Agent OS SDK” for embedding in React. This project uses the verified Track A surface directly:

1. **Binance Skills Hub format** — [`skills/portfolio-detective/SKILL.md`](skills/portfolio-detective/SKILL.md) is an installable agent skill with the official YAML/frontmatter structure and a constrained workflow.
2. **Agent tool orchestration** — `src/agent/tools.ts` exposes `investigate_portfolio`; `portfolioAgent.ts` orchestrates it; `cli.ts` is the executable bridge used by the skill.
3. **Official Binance Spot APIs** — Live Mode uses `GET /api/v3/account`, `GET /api/v3/ticker/price`, and `GET /api/v3/klines` at `https://api.binance.com`.
4. **Structured handoff** — the tool returns JSON calculations; the Agent OS client explains those values under evidence rules. The language model does not calculate impact.
5. **Optional official MCP connection** — compatible AI clients can separately connect `https://agent.binance.com/mcp/agentic` for OAuth-based Agentic-account balances and market tools. The web app does not falsely claim this OAuth connection; Binance has not documented a browser-app client flow or stable MCP tool names for it.

Official sources reviewed:

- [Introducing Binance Agent OS](https://www.binance.com/en-NG/support/announcement/detail/07d45cdd3831498f8a4ff339031a8480)
- [Binance MCP Server](https://developers.binance.com/en/docs/agent-native/mcp-server/agentic)
- [Agent Native overview](https://developers.binance.com/en/docs/agent-native/overview)
- [Binance Skills Hub](https://github.com/binance/binance-skills-hub)
- [Binance Spot REST API](https://developers.binance.com/en/docs/products/spot/rest-api)

## Installation

Requires Node.js 22.13 or newer.

```bash
cd portfolio-detective
npm install
npm run dev
```

Open the local URL printed by the development server.

Production checks:

```bash
npm test
npm run typecheck
npm run build
```

## Demo Mode

Demo Mode is enabled by default and needs no credentials.

```bash
npm run agent:investigate -- --demo
```

The dashboard states that holdings and market evidence are fixed sample data. This keeps a short hackathon demo reliable even without network access. To use the agent, install or copy `skills/portfolio-detective` into a compatible client's skills directory; the skill runs the command and narrates only the returned JSON.

## Live Mode

1. Create a Binance API key with **read-only** permissions. Never enable withdrawals or trading.
2. Copy `.env.example` to `.env.local`.
3. Set `BINANCE_API_KEY` and `BINANCE_API_SECRET`.
4. Restart the server, turn off Demo Mode, and start an investigation.

```dotenv
BINANCE_API_KEY=your_read_only_key
BINANCE_API_SECRET=your_secret
BINANCE_AGENT_OS_MCP_URL=https://agent.binance.com/mcp/agentic
```

Credentials stay server-side. `.env*` files are ignored except `.env.example`.

### Optional MCP Agentic Account

For supported AI clients, add `https://agent.binance.com/mcp/agentic`, authenticate in the browser, and grant the minimum Account and Market Data scopes. Configure it through the client's MCP settings—not by opening the endpoint or pasting it into chat. This is separate from the dashboard's API-key Live Mode.

## Contribution Mathematics

```text
previous value = quantity × previous price
current value  = quantity × current price
dollar impact  = current value − previous value
```

For assets moving in one direction, contribution is impact divided by net portfolio change. If gains and losses offset, the UI switches to **gross absolute movement**: `abs(asset impact) / sum(abs(all impacts))`. This sums to 100% and avoids presenting negative or greater-than-100% net shares as intuitive proportions. Percentages are unavailable when their denominator is zero or effectively zero.

## Architecture

```text
Dashboard ──────────────┐
                       ├→ API route → investigationService
Agent OS skill → CLI ──┘                 │
                              ┌───────────┴───────────┐
                       portfolioService       marketService
                              └───────────┬───────────┘
                                          ↓
                                   calculations.ts
                                          ↓
                                structured case result
```

## Error Handling

Friendly errors cover missing credentials, empty portfolios, unsupported USDT pairs, Binance rate limits, unavailable evidence, and tool failures. Safe debugging detail is logged server-side. Unsupported assets pause the case instead of silently creating partial totals.

## Limitations

- Live Mode currently analyzes non-zero Binance Spot balances, not Earn, Funding, Margin, or Futures wallets.
- Live assets need a direct USDT Spot pair; unsupported assets stop the case.
- Stable assets are valued at a documented 1 USD assumption.
- Previous price is the prior completed daily close and current price is a live ticker; this is not cost-basis P&L.
- The dashboard summary is deterministic. A genuinely AI-written narrative is produced when the skill runs in an Agent OS-compatible client.
- Binance MCP uses client-level interactive OAuth. No embeddable React SDK or guaranteed MCP tool names are documented, so none are invented here.
- Availability depends on region, account eligibility, and Binance support.

## Two-Minute Demo Script

1. **0:00–0:20** — “My portfolio moved—but which holding did it?” Show the Demo Mode label.
2. **0:20–0:50** — Click **Start Investigation** and point out the evidence trail.
3. **0:50–1:25** — Show total value, change, main contributor, and the contribution ledger. Explain gross contribution for offsetting moves.
4. **1:25–1:50** — Run `npm run agent:investigate -- --demo`; show the Agent OS `SKILL.md` and its no-invention rules.
5. **1:50–2:15** — Toggle Live Mode and explain read-only Spot credentials plus the optional official MCP connection.
6. **2:15–2:30** — “The arithmetic is deterministic, the narrative is evidence-bound, and the case is reproducible.”

## Disclaimer

Portfolio Detective provides informational portfolio analysis only. It is not investment, trading, tax, or financial advice. Digital asset prices are volatile; verify all data independently.
