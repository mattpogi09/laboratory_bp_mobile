# Code Organization

## 📁 Directory Structure

```
laboratory_bp_mobile/
├── app/
│   ├── types/           # TypeScript type definitions
│   │   ├── index.ts     # Barrel export
│   │   ├── reports.ts   # Report-related types
│   │   ├── lab-queue.ts # Lab queue types
│   │   ├── services.ts  # Service types
│   │   └── discounts.ts # Discount & PhilHealth types
│   │
│   ├── utils/           # Utility functions
│   │   ├── index.ts     # Barrel export
│   │   ├── format.ts    # Formatting (currency, numbers)
│   │   ├── date.ts      # Date utilities
│   │   ├── validation.ts # Form validation helpers
│   │   └── api-helpers.ts # API error handling
│   │
│   ├── (tabs)/          # Main tab screens
│   ├── (drawer)/        # Drawer screens
│   └── services/        # API service layer
│
└── components/          # Reusable UI components
    ├── index.ts         # Barrel export
    ├── StatCard.tsx     # Statistics card component
    ├── StatusBadge.tsx  # Status badge with variants
    ├── DropdownModal.tsx # Generic dropdown modal
    ├── LoadingState.tsx # Loading indicator
    ├── EmptyState.tsx   # Empty state with icon
    ├── reports/         # Report-specific components
    │   └── FinancialTab.tsx
    └── services/        # Service-specific components
        └── ServiceForm.tsx
```

## 🎯 Import Patterns

### Types
```typescript
// Import specific types
import type { FinancialRow, LabReportRow } from "@/app/types";

// Import all from a module
import type { Service, ServicesResponse } from "@/app/types";
```

### Utilities
```typescript
// Import formatting utilities
import { formatCurrency, formatDecimal } from "@/app/utils";

// Import date utilities
import { getDateRange, periods } from "@/app/utils";

// Import validation
import { validateRequired, validateNumber } from "@/app/utils";

// Import API helpers
import { showApiError, handleApiError } from "@/app/utils";
```

### Components
```typescript
// Import shared components
import { StatCard, StatusBadge, DropdownModal } from "@/components";
import { LoadingState, EmptyState } from "@/components";
```

## 📝 Best Practices

### 1. Type Definitions
- All types are centralized in `app/types/`
- Use descriptive names for types
- Export types with `export type`
- Group related types in the same file

### 2. Utility Functions
- Keep utilities pure and focused
- Add proper TypeScript types
- Export from index for easy access
- Document complex logic

### 3. Components
- Extract reusable UI patterns
- Use TypeScript for props
- Keep components focused (single responsibility)
- Export from index.ts

### 4. Error Handling
```typescript
// Use showApiError for user-facing errors
try {
  await api.get('/endpoint');
} catch (error) {
  showApiError(error, 'Failed to load data');
}
```

### 5. Validation
```typescript
// Use validation utilities
const { isValid, errors } = validateForm([
  { value: name, name: 'Name', validators: [validateRequired] },
  { value: price, name: 'Price', validators: [validateRequired, validateNumber] },
]);
```

## 🔄 Migration Guide

### Before (Duplicated Code)
```typescript
// In multiple files
const formatCurrency = (value = 0) =>
  `₱${value.toLocaleString("en-PH", { maximumFractionDigits: 0 })}`;

type FinancialRow = {
  id: number;
  date: string;
  // ...
};
```

### After (Centralized)
```typescript
// Import once
import { formatCurrency } from "@/app/utils";
import type { FinancialRow } from "@/app/types";
```

## 📊 Benefits

- ✅ **DRY Principle** - No duplicate code
- ✅ **Type Safety** - Consistent types across app
- ✅ **Maintainability** - Easy to find and update
- ✅ **Reusability** - Shared components and utilities
- ✅ **Performance** - Better tree-shaking
- ✅ **Developer Experience** - Clear structure
