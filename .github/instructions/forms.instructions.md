---
description: "Use when creating or modifying forms, intake wizards, or validation logic. Covers React Hook Form + Zod v4 manual validation pattern."
applyTo: "src/**/*form*,src/**/*intake*,src/**/*new*"
---
# Form Handling

## Stack

- React Hook Form v7 for state management
- Zod v4 for validation schemas
- Manual `safeParse()` — `@hookform/resolvers` has compatibility issues with Zod v4

## Pattern

```tsx
'use client'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1, 'Required'),
  email: z.string().email('Invalid email'),
})

type FormData = z.infer<typeof schema>

export function MyForm() {
  const form = useForm<FormData>({ defaultValues: { name: '', email: '' } })

  function onSubmit(data: FormData) {
    const result = schema.safeParse(data)
    if (!result.success) {
      // Map errors to form fields
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof FormData
        form.setError(field, { message: issue.message })
      }
      return
    }
    // Submit result.data
  }

  return <form onSubmit={form.handleSubmit(onSubmit)}>{/* fields */}</form>
}
```

## Zod v4 Gotchas

- `z.literal("yes", { errorMap })` does NOT work — use `z.string().refine(v => v === "yes")`
- Use `z.string().min(1)` for required strings (not `z.string().nonempty()`)
- Schema inference: `z.infer<typeof schema>` works the same as v3

## Multi-Step Wizards

- Keep per-step schemas, validate only the current step before advancing
- Use `form.trigger(fields)` or manual `safeParse` per step
- Store all steps in a single `useForm` with the combined type
