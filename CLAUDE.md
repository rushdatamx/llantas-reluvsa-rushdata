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

- **n8n Workflows**: `reluvsa-chatbot.json` - receives webhooks from Twilio, calls Edge Function, sends responses
- **Supabase Edge Functions**:
  - `chatbot-handler-v2` - Main AI chatbot logic (message processing, inventory lookup, payment link generation)
  - `vendor-reply-v2` - Manual vendor responses
  - `stripe-webhook` - Handles Stripe payment confirmations
  - `order-notification` - Sends order notifications
  - `create-payment-link` - Creates Stripe payment links
- **Dashboard**: Next.js 16 app with Supabase auth, shadcn/ui components

### Database Tables (Supabase)

Core tables for the chatbot:
- `leads` - Customer leads with pipeline stages
- `sesiones_chat` - Active chat sessions with conversation state
- `mensajes` - Message history
- `pedidos` - Orders with Stripe integration
- `inventario` - Tire inventory (NEREUS and TORNEL brands)
- `conversaciones` - Legacy conversation storage
- `codigos_postales_locales` - Local zip codes for free shipping

## Commands

### Dashboard (reluvsa-dashboard/)

```bash
cd reluvsa-dashboard
npm run dev      # Start development server (localhost:3000)
npm run build    # Production build
npm run lint     # Run ESLint
```

### Root (shadcn MCP)

The root `package.json` only contains shadcn as a dev dependency for the MCP server.

## Dashboard Structure

```
reluvsa-dashboard/src/
├── app/
│   ├── (dashboard)/          # Protected routes with sidebar layout
│   │   ├── page.tsx          # Dashboard home with metrics
│   │   ├── pipeline/         # Kanban-style lead pipeline
│   │   ├── conversations/    # Chat view with customers
│   │   ├── cotizador/        # Quote generator
│   │   ├── inventario/       # Inventory management
│   │   ├── pedidos/          # Order management
│   │   └── configuracion/    # Settings
│   ├── login/                # Auth page
│   └── auth/callback/        # Supabase auth callback
├── components/
│   ├── ui/                   # shadcn/ui components
│   ├── pipeline/             # Drag-and-drop pipeline board
│   ├── conversations/        # Chat components
│   ├── pedidos/              # Order components
│   └── cotizador/            # Quote form
├── lib/
│   ├── supabase/             # Supabase client (client.ts, server.ts, middleware.ts)
│   ├── actions/              # Server actions for payments and orders
│   └── pdf/                  # PDF quote generation with jsPDF
├── stores/                   # Zustand stores
└── types/database.ts         # TypeScript types for DB entities
```

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
- Local shipping (within 50km of Ciudad Victoria) uses `codigos_postales_locales` table

## Environment Variables

Dashboard requires in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Edge Functions use (configured in Supabase):
- `OPENAI_API_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- Twilio credentials (in n8n)
