

# Bug Fix: Plan selection redirect not including query params

## Problem
When a user is **not logged in**, the `PlanCard` component receives `onSelect={undefined}`, so it renders a plain `<Link to="/auth">` instead of calling `handleSelectPlan`. The redirect logic with `?redirect=/planos&plan=pro` is never executed.

## Fix: `src/pages/PricingPage.tsx` (line 196-198)

Change the PlanCard props so that `onSelect` is **always provided** for paid plans (regardless of login state), allowing `handleSelectPlan` to run and navigate with the correct query parameters:

```tsx
// Before:
onSelect={user ? (plan.key !== "free" ? () => handleSelectPlan(plan.key) : () => {}) : undefined}
external={false}
ctaLink={!user ? "/auth" : plan.ctaLink}

// After:
onSelect={plan.key !== "free" ? () => handleSelectPlan(plan.key) : undefined}
external={false}
ctaLink={plan.ctaLink}
```

This ensures that clicking "Assinar Pro" always calls `handleSelectPlan`, which handles the redirect to `/auth?redirect=/planos&plan=pro` when the user is not logged in. The free plan will still render as a simple link.

