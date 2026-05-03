# Patient Portal — Cloud Care Pharmacy

A Next.js 16 Patient Management System frontend that connects to the [prescription-gateway](https://github.com/Cloud-Care-Pharmacy/prescription-gateway) Cloudflare Worker API.

## Tech Stack

- **Next.js 16** — App Router, Server Components, Server Actions
- **TypeScript** — Strict mode
- **shadcn/ui** — UI components (Tailwind CSS)
- **MUI DataGrid** — Data tables (`@mui/x-data-grid`)
- **NextAuth.js v5** — Google OAuth authentication
- **TanStack Query** — Server state / data fetching
- **React Hook Form + Zod** — Form validation
- **Sonner** — Toast notifications

## Architecture

```
Browser ──► Next.js App ──► /api/proxy/[...path] ──► prescription-gateway API
               │                    │
       Google OAuth          X-API-Key injected
       (NextAuth v5)           server-side
```

All API calls go through a server-side proxy route that injects the `X-API-Key` header. The API secret is never exposed to the browser.

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+
- A Google OAuth app (from Google Cloud Console)
- A running prescription-gateway backend

### Setup

```bash
# Clone
git clone https://github.com/Cloud-Care-Pharmacy/patient-portal.git
cd patient-portal

# Install dependencies
npm install

# Copy environment variables
cp .env.local.example .env.local

# Fill in your values in .env.local (see below)

# Run dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

| Variable                        | Description                                                                                 | Required |
| ------------------------------- | ------------------------------------------------------------------------------------------- | -------- |
| `NEXTAUTH_URL`                  | App URL (e.g., `http://localhost:3000`)                                                     | Yes      |
| `NEXTAUTH_SECRET`               | Random secret for NextAuth session encryption                                               | Yes      |
| `GOOGLE_CLIENT_ID`              | Google OAuth Client ID                                                                      | Yes      |
| `GOOGLE_CLIENT_SECRET`          | Google OAuth Client Secret                                                                  | Yes      |
| `NEXT_PUBLIC_API_URL`           | Backend API URL (prescription-gateway)                                                      | Yes      |
| `API_SECRET`                    | API key matching `API_SECRET` in prescription-gateway                                       | Yes      |
| `NEXT_PUBLIC_DEFAULT_ENTITY_ID` | Fallback entity/shop ID from D1 (used when the Clerk user has no `publicMetadata.entityId`) | No       |
| `ADMIN_EMAILS`                  | Comma-separated admin emails                                                                | No       |
| `DOCTOR_EMAILS`                 | Comma-separated doctor emails                                                               | No       |

## Pages

| Route            | Description                                         | API Status           |
| ---------------- | --------------------------------------------------- | -------------------- |
| `/login`         | Google OAuth sign-in                                | ✅                   |
| `/dashboard`     | Summary cards, recent activity, quick actions       | Partial (mock stats) |
| `/patients`      | Patient list with MUI DataGrid                      | ✅ Real API          |
| `/patients/new`  | 8-step intake form wizard                           | ✅ Real API          |
| `/patients/[id]` | Patient detail with tabs (Prescriptions, Documents) | ✅ Real API          |
| `/prescriptions` | Prescription viewer (per-patient)                   | ✅ Real API          |
| `/consultations` | Consultation list (mock data)                       | ❌ Needs backend     |
| `/admin`         | Staff management (mock data)                        | ❌ Needs backend     |

## Deployment

This project is designed for Vercel deployment:

1. Connect the GitHub repo to Vercel
2. Set all environment variables in Vercel dashboard
3. `API_SECRET` must be a server-side env var (not prefixed with `NEXT_PUBLIC_`)
4. Deploy

## License

Private — Cloud Care Pharmacy
