# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RELUVSA Chatbot is a WhatsApp-based AI chatbot system for a tire (llantas) retailer in Mexico. The system allows customers to:
- Get tire quotes via WhatsApp
- Complete purchases with Stripe payment links
- Receive order notifications

The project consists of two main parts:
1. **n8n Workflows** - Handle Twilio WhatsApp webhooks and message routing
2. **reluvsa-dashboard** - Next.js admin dashboard for managing leads, orders, and conversations

## Architecture

```
WhatsApp → Twilio → n8n Workflow → Supabase Edge Function (chatbot-handler-v2)
                                           ↓
                              ┌────────────┼────────────┐
                              ↓            ↓            ↓
                         Supabase DB   OpenAI API   Stripe
                              ↓
                    n8n sends response via Twilio
```

### Key Components

- **n8n Workflows**: `reluvsa-chatbot.json` - receives webhooks from Twilio, calls Edge Function, sends responses. The workflow checks for `__HANDOFF_ACTIVE__` in responses to suppress bot replies when a vendor has taken over.
- **Supabase Edge Functions**:
  - `chatbot-handler-v2` - Main AI chatbot logic (message processing, inventory lookup, payment link generation)
  - `vendor-reply-v2` - Manual vendor responses from dashboard
  - `stripe-webhook` - Handles Stripe payment confirmations
  - `order-notification` - Sends order status notifications via WhatsApp
  - `create-payment-link` - Creates Stripe payment links
- **Dashboard**: Next.js 16 app with Supabase auth, shadcn/ui components

### Chat Session State Machine

Sessions (`sesiones_chat`) track conversation state via the `estado` field:
```
inicio → buscando_medida → mostrando_opciones → seleccionando_producto
  → pidiendo_cantidad → confirmando_cotizacion → pidiendo_nombre
  → pidiendo_email → pidiendo_direccion → generando_link
  → esperando_pago → completado
```

### Bot vs Vendor Handoff

The `atendido_por` field in `sesiones_chat` controls who responds:
- `'bot'` - AI handles responses automatically
- `'vendedor'` - Bot is silenced; vendor responds manually via dashboard

When `atendido_por = 'vendedor'`, the edge function returns `__HANDOFF_ACTIVE__` and n8n skips sending the bot response.

### Pipeline Stages

Leads flow through: `explorando` → `cotizado` → `link_enviado` → `pagado` → `entregado` (or `perdido`)

Order state changes automatically sync the session's `pipeline_stage` via server actions.

## Commands

### Dashboard (reluvsa-dashboard/)

```bash
cd reluvsa-dashboard
npm run dev      # Start development server (localhost:3000)
npm run build    # Production build
npm run lint     # Run ESLint
```

## Dashboard Patterns

### Server Actions
Located in `src/lib/actions/`. These call Supabase Edge Functions and handle path revalidation:
- `payment-link.ts` - Creates Stripe payment links via edge function
- `pedidos.ts` - Updates order status, tracking info, syncs pipeline stages

### State Management
- **Zustand** (`src/stores/app-store.ts`) - Global state for sessions, messages, orders, inventory
- Server components fetch from Supabase directly; client components use the store

### Authentication
- Supabase Auth with middleware protection (`src/middleware.ts`)
- Protected routes under `(dashboard)/` layout

## Database Tables (Supabase)

- `sesiones_chat` - Active chat sessions with conversation state, cart, pipeline_stage, atendido_por
- `mensajes` - Message history (tipo: 'cliente' | 'bot' | 'vendedor')
- `pedidos` - Orders with Stripe integration, tracking info, estado flow
- `inventario` - Tire inventory (NEREUS and TORNEL brands)
- `codigos_postales_locales` - Local zip codes for free shipping

## MCP Servers Configured

- **supabase** - Database operations via MCP
- **stripe** - Payment processing
- **n8n-mcp** - Workflow execution
- **shadcn** - Component registry

## Business Logic Notes

- All tire prices are **per unit** (por pieza)
- Shipping: Free on orders > $2,499 MXN, otherwise $299/pair
- Brands: NEREUS and TORNEL only
- Tire sizes must be normalized (e.g., "185 65 15" → "185/65R15")
- MSI (monthly payments) only available in-store
- Local delivery (Ciudad Victoria area) uses `codigos_postales_locales` table
- Business constants in `src/lib/constants.ts` (NEGOCIO object)

## Environment Variables

Dashboard requires in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Edge Functions use (configured in Supabase):
- `OPENAI_API_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- Twilio credentials (in n8n)
