

# Fix parseStoreAddress to Handle Variable-Length Addresses

## Problem

`buildStoreAddress` filters out empty fields with `.filter(Boolean)`, so a partial address like CEP + Number + State produces `"01001000, 100, SP, Brasil"` (4 parts). But `parseStoreAddress` requires `parts.length >= 6` to start parsing, so it falls through to the dumb fallback that puts the entire string into the `street` field.

## Solution

Rewrite `parseStoreAddress` to work with any number of parts by:

1. Strip trailing "Brasil" if present
2. Detect the state (last part matching BRAZIL_STATES list)
3. Detect the CEP (any part matching the 8-digit pattern)
4. Assign remaining parts positionally based on the canonical order: street, number, complement, neighborhood, city

## File Changed

**`src/lib/storeAddress.ts`** - Replace the `parseStoreAddress` function

### New Logic

```
1. Split by comma, trim each part
2. Remove trailing "Brasil"
3. Find and extract state (last part in BRAZIL_STATES)
4. Find and extract CEP (any part matching /^\d{5}-?\d{3}$/)
5. Find and extract city (last remaining part, if state was found)
6. Remaining parts map positionally to: street, number, complement, neighborhood
```

This handles all formats:
- Full: `"01001-000, Rua X, 100, Apto 4, Centro, Sao Paulo, SP, Brasil"` (8 parts)
- No complement: `"01001-000, Rua X, 100, Centro, Sao Paulo, SP, Brasil"` (7 parts)  
- Minimal from wizard: `"01001000, 100, SP, Brasil"` (4 parts)
- Legacy no-CEP: `"Rua X, 100, Centro, Sao Paulo, SP"` (5 parts)

No database changes needed.

