

# Fix: Edge Functions crashing — `getClaims is not a function`

## Problem
Both `create-mp-subscription` and `cancel-mp-subscription` use `supabase.auth.getClaims(token)` which does not exist in `@supabase/supabase-js@2.49.1`. This causes a 500 error on every call.

## Fix
Replace `getClaims(token)` with `supabase.auth.getUser()` in both functions. Since the client is already initialized with the user's Authorization header, `getUser()` will return the authenticated user's data (id, email).

### Changes

**1. `supabase/functions/create-mp-subscription/index.ts`** (lines 30-40)
- Replace `getClaims` block with:
```typescript
const { data: { user }, error: userError } = await supabase.auth.getUser();
if (userError || !user) { return 401 }
const userEmail = user.email!;
const userId = user.id;
```

**2. `supabase/functions/cancel-mp-subscription/index.ts`** (lines 29-38)
- Same pattern:
```typescript
const { data: { user }, error: userError } = await supabase.auth.getUser();
if (userError || !user) { return 401 }
const userId = user.id;
```

Both functions keep the same logic, just swap the auth method. No other changes needed.

