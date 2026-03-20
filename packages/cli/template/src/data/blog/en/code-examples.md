---
title: "Code Highlighting Examples"
description: "Demonstrate Shiki code highlighting with multiple programming languages and advanced features"
pubDatetime: 2024-01-05T00:00:00.000Z
author: "Your Name"
tags:
  - tutorial
  - code
category: Tutorial/Features
---

## Basic Code Blocks

### TypeScript

```typescript
interface User {
  id: number;
  name: string;
  email: string;
}

async function fetchUser(id: number): Promise<User> {
  const response = await fetch(`/api/users/${id}`);
  if (!response.ok) {
    throw new Error('Failed to fetch user');
  }
  return response.json();
}

// Usage
const user = await fetchUser(1);
console.log(user.name);
```

### Python

```python
from dataclasses import dataclass
from typing import Optional

@dataclass
class User:
    id: int
    name: str
    email: Optional[str] = None

def fetch_user(user_id: int) -> User:
    """Fetch a user by ID."""
    # Simulate API call
    return User(id=user_id, name="John Doe", email="john@example.com")

# Usage
user = fetch_user(1)
print(f"User: {user.name}")
```

## Advanced Features

### Line Numbers

```typescript showLineNumbers
function fibonacci(n: number): number {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

// Calculate first 10 Fibonacci numbers
for (let i = 0; i < 10; i++) {
  console.log(fibonacci(i));
}
```

### Highlight Lines

```typescript {2,5-7}
function processData(data: unknown) {
  if (!data) throw new Error('No data provided');  // Highlighted
  
  return {
    success: true,    // Highlighted
    data: data,       // Highlighted
    timestamp: Date.now()  // Highlighted
  };
}
```

### Diff Highlighting

```diff
function calculateTotal(items: Item[]) {
-  return items.reduce((sum, item) => sum + item.price, 0);
+  const subtotal = items.reduce((sum, item) => sum + item.price, 0);
+  const tax = subtotal * 0.1;
+  return subtotal + tax;
}
```

For more code highlighting options, see the [Shiki documentation](https://shiki.style/).