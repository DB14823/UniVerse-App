# Event Price Migration Guide - String to Decimal

## Changes Made

### Schema Update
Changed `Event.price` from `String` to `Decimal @db.Decimal(10, 2)` for proper monetary value handling.

### Why This Change?
- **String is incorrect for money**: Strings can't be used for calculations or comparisons
- **Decimal provides precision**: Avoids floating-point rounding errors
- **Database optimization**: PostgreSQL DECIMAL type is designed for monetary values
- **Better type safety**: TypeScript will now enforce numeric values

## Migration Applied ✅

### Migration Details:
- **Migration Name**: `20260310151413_change_event_price_to_decimal_with_default`
- **Status**: Successfully applied
- **What it did**:
  1. Removed currency symbols (£, $) from existing prices
  2. Set null/empty prices to 0.00
  3. Converted price column from TEXT to DECIMAL(10,2)

### Prisma Client Generated ✅
The Prisma client has been regenerated with the Decimal type for prices.

## Frontend Updates Required

### 1. Update API Calls to Send Numbers

**When creating events:**
```typescript
// Before
const response = await fetch(`${API_BASE_URL}/events`, {
  method: 'POST',
  body: JSON.stringify({
    title,
    description,
    date,
    location,
    price: price, // string like "£5.00"
  }),
});

// After
const response = await fetch(`${API_BASE_URL}/events`, {
  method: 'POST',
  body: JSON.stringify({
    title,
    description,
    date,
    location,
    price: parseFloat(price.replace(/[^0-9.]/g, '')) || 0, // Convert to number
  }),
});
```

**When updating events:**
```typescript
// Clean the price value before sending
const cleanPrice = parseFloat(editPrice.replace(/[^0-9.]/g, '')) || 0;
await updateEvent({
  id: eventId,
  price: cleanPrice,
  // ... other fields
});
```

### 2. Display Prices Correctly

Prisma returns Decimal objects. Convert them for display:

```typescript
// API returns Decimal objects
const price = event.price;

// Convert to number for display
const priceNumber = Number(price);

// Format as currency (GBP)
const formattedPrice = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
}).format(priceNumber);

// Result: "£5.00"
```

### 3. Update Form Inputs

**Price input handling:**
```typescript
// State for form
const [editPrice, setEditPrice] = useState("£");

// Format user input
const formatPriceDisplay = (rawValue: string) => {
  const cleaned = rawValue.replace(/£/g, "").replace(/[^0-9.]/g, "");
  if (!cleaned) return "£";

  const parts = cleaned.split(".");
  const whole = parts[0] || "0";
  const fractional = parts.slice(1).join("").slice(0, 2);
  const hasDot = parts.length > 1;

  return `£${whole}${hasDot ? "." + fractional : ""}`;
};

// Normalize for submission
const normalizePrice = (rawValue: string) => {
  const cleaned = rawValue.replace(/£/g, "").replace(/[^0-9.]/g, "");
  if (!cleaned || cleaned === ".") return 0;

  return parseFloat(cleaned);
};
```

## Files to Update

### Priority 1 (Critical):
1. **`SourceCode/frontend/app/Organisations/createEvent.tsx`**
   - Update form submission to send numeric price
   - Update price input handling

2. **`SourceCode/frontend/app/Organisations/eventsOrg.tsx`**
   - Update `handleSave` function to send numeric price
   - Update price display logic

3. **`SourceCode/frontend/app/Students/EventFeed.tsx`**
   - Update price display to handle Decimal type

### Priority 2 (Nice to have):
- Any other files that read or write event prices
- Price formatting utilities

## Testing Checklist

After updating frontend code:

- [ ] **Create Event**: Can create event with numeric price
- [ ] **Edit Event**: Can update event price
- [ ] **Display Events**: Prices show correctly formatted (e.g., "£5.00")
- [ ] **Price Validation**: Invalid prices handled gracefully
- [ ] **Zero Price**: Free events (price = 0) work correctly
- [ ] **Large Prices**: Prices > £999.99 display correctly
- [ ] **Decimal Precision**: Prices with pence work correctly (e.g., £5.99)

## Benefits

✅ Type-safe monetary calculations
✅ No floating-point errors
✅ Proper database indexing
✅ Can now sort/filter by price
✅ Can perform aggregations (SUM, AVG, etc.)
✅ Database-level validation

## Rollback Plan

If critical issues arise:

```sql
-- Revert price column to TEXT
ALTER TABLE "Event" ALTER COLUMN "price" TYPE TEXT;
```

Then update schema.prisma back to `price String` and regenerate client.

---

**Migration Status:** ✅ **COMPLETE**

**Next Step:** Update frontend components to handle Decimal prices properly.

**Questions?** Check Prisma Decimal docs: https://www.prisma.io/docs/concepts/components/prisma-schema/data-model#decimals