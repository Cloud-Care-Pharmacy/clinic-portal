---
name: next-upgrade
description: "Upgrade Next.js to the latest version. Use when upgrading Next.js, React, or related dependencies."
argument-hint: "[target-version]"
---

# Upgrade Next.js

## Instructions

1. **Detect current version**: Read `package.json` for Next.js, React, and related deps

2. **Check upgrade guide**: https://nextjs.org/docs/app/guides/upgrading/codemods

3. **Run codemods first**:
   ```bash
   npx @next/codemod@latest <transform> <path>
   ```

4. **Update dependencies**:
   ```bash
   npm install next@latest react@latest react-dom@latest
   npm install @types/react@latest @types/react-dom@latest
   ```

5. **Check breaking changes**: async params, middleware changes, config changes

6. **Verify compatibility** of: shadcn/ui, MUI DataGrid, NextAuth v5, TanStack Query, React Hook Form

7. **Test**:
   ```bash
   npx tsc --noEmit
   npm run build
   npm run dev
   npm run lint
   ```

## Project-Specific Notes

- Middleware at `src/middleware.ts` — uses NextAuth `auth` wrapper
- shadcn/ui v4 uses `@base-ui/react` — check compatibility
- MUI DataGrid and Emotion — verify React version support
- NextAuth v5 beta — check for stable release compatibility
