---
title: "代码高亮示例"
description: "展示 Shiki 代码高亮功能，支持多种编程语言和高级特性"
pubDatetime: 2024-01-05T00:00:00.000Z
tags:
  - 教程
  - 代码
---

## 基础代码块

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

// 使用示例
const user = await fetchUser(1);
console.log(`Hello, ${user.name}!`);
```

### Python

```python
from typing import List, Optional

class Calculator:
    """一个简单的计算器类"""
    
    def __init__(self, initial_value: float = 0):
        self.value = initial_value
    
    def add(self, x: float) -> 'Calculator':
        self.value += x
        return self
    
    def multiply(self, x: float) -> 'Calculator':
        self.value *= x
        return self

# 链式调用
result = Calculator(10).add(5).multiply(2).value
print(f"Result: {result}")  # Result: 30.0
```

### Rust

```rust
use std::collections::HashMap;

fn main() {
    let mut scores = HashMap::new();
    
    scores.insert("Alice", 95);
    scores.insert("Bob", 87);
    scores.insert("Charlie", 92);
    
    for (name, score) in &scores {
        println!("{}: {}", name, score);
    }
}
```

## 高级特性

### 代码标题

```typescript title="utils/date.ts"
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}
```

### 行号显示

```typescript showLineNumbers
function fibonacci(n: number): number {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

// 计算前 10 个斐波那契数
for (let i = 0; i < 10; i++) {
  console.log(fibonacci(i));
}
```

### 代码差异高亮

```diff
function calculateTotal(items: CartItem[]): number {
-  return items.reduce((sum, item) => sum + item.price, 0);
+  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}
```

### 行高亮

```typescript {2,5-7}
function processUser(user: User) {
  const validated = validateUser(user);  // 高亮
  if (!validated) {
    throw new Error('Invalid user');
  }
  saveToDatabase(user);  // 高亮
  sendNotification(user);  // 高亮
  return user;
}
```

### 复制按钮

所有代码块都支持一键复制功能，点击右上角的复制按钮即可。

## 更多语言示例

### Go

```go
package main

import "fmt"

func main() {
    messages := make(chan string)
    
    go func() {
        messages <- "Hello, World!"
    }()
    
    msg := <-messages
    fmt.Println(msg)
}
```

### SQL

```sql
SELECT 
    u.name,
    COUNT(o.id) as order_count,
    SUM(o.total) as total_spent
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE u.created_at > '2024-01-01'
GROUP BY u.id
HAVING total_spent > 1000
ORDER BY total_spent DESC
LIMIT 10;
```

代码高亮使用 [Shiki](https://shiki.matsu.io/) 引擎，支持数百种编程语言！