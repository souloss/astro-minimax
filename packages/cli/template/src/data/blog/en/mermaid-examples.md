---
title: "Mermaid Diagram Examples"
description: "Demonstrate Mermaid flowcharts, sequence diagrams, class diagrams, and 11 diagram types"
pubDatetime: 2024-01-02T00:00:00.000Z
author: "Your Name"
tags:
  - tutorial
  - Mermaid
category: Tutorial/Tools
---

This article demonstrates how to create various Mermaid diagrams using ` ```mermaid ` code blocks.

---

## 1. Flowchart

### 1.1 Basic Flowchart

```mermaid
flowchart TD
    A[Start] --> B{Condition}
    B -->|Yes| C[Execute A]
    B -->|No| D[Execute B]
    C --> E[End]
    D --> E
```

### 1.2 Horizontal Flowchart

```mermaid
flowchart LR
    A[Request] --> B[Load Balancer]
    B --> C[Server A]
    B --> D[Server B]
    C --> E[(Database)]
    D --> E
```

---

## 2. Sequence Diagram

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant Database
    
    User->>Frontend: Click login
    Frontend->>Backend: POST /api/login
    Backend->>Database: Query user
    Database-->>Backend: Return data
    Backend-->>Frontend: Return JWT
    Frontend-->>User: Redirect home
```

---

## 3. Class Diagram

```mermaid
classDiagram
    class Animal {
        +String name
        +int age
        +makeSound()
    }
    class Dog {
        +String breed
        +bark()
    }
    class Cat {
        +String color
        +meow()
    }
    Animal <|-- Dog
    Animal <|-- Cat
```

---

## 4. State Diagram

```mermaid
stateDiagram-v2
    [*] --> Pending
    Pending --> Processing: Start
    Processing --> Completed: Success
    Processing --> Cancelled: Failure
    Completed --> [*]
    Cancelled --> [*]
```

---

## 5. ER Diagram

```mermaid
erDiagram
    USER ||--o{ ORDER : places
    USER {
        int id PK
        string username
        string email
    }
    ORDER ||--|{ ORDER_ITEM : contains
    ORDER {
        int id PK
        int user_id FK
        datetime order_date
        string status
    }
    PRODUCT ||--o{ ORDER_ITEM : "included in"
    PRODUCT {
        int id PK
        string name
        float price
    }
    ORDER_ITEM {
        int id PK
        int quantity
        float unit_price
    }
```

---

## 6. Gantt Chart

```mermaid
gantt
    title Project Timeline
    dateFormat YYYY-MM-DD
    section Design
    Requirements :a1, 2024-01-01, 7d
    UI Design :a2, after a1, 5d
    section Development
    Frontend :b1, after a2, 14d
    Backend :b2, after a2, 14d
    section Testing
    QA Testing :c1, after b1, 7d
    Deployment :c2, after c1, 3d
```

---

## 7. Pie Chart

```mermaid
pie showData
    title Programming Language Usage
    "TypeScript" : 35
    "Python" : 25
    "Go" : 20
    "Rust" : 12
    "Others" : 8
```

---

## 8. Git Graph

```mermaid
gitGraph
    commit id: "Init project"
    commit id: "Add features"
    branch develop
    checkout develop
    commit id: "WIP"
    checkout main
    merge develop id: "v1.0" tag: "v1.0"
```

---

## 9. User Journey

```mermaid
journey
    title Shopping Experience
    section Browse
        Open homepage: 5: User
        Search products: 4: User
    section Purchase
        Add to cart: 4: User
        Checkout: 3: User, System
    section Receive
        Confirm delivery: 5: User
        Rate product: 4: User
```

---

## 10. Mindmap

```mermaid
mindmap
  root((Web Development))
    Frontend
      HTML/CSS
      JavaScript
        TypeScript
        Frameworks
          Vue
          React
    Backend
      Node.js
      Python
      Go
    Database
      MySQL
      MongoDB
      Redis
```

---

## 11. Custom Styling

```mermaid
flowchart TD
    A[Start] --> B[Process]
    B --> C[End]

    style A fill:#f9f,stroke:#333,stroke-width:2px
    style B fill:#bbf,stroke:#333,stroke-width:2px
    style C fill:#bfb,stroke:#333,stroke-width:2px
```

---

## References

- [Mermaid Documentation](https://mermaid.js.org/)
- [Mermaid Live Editor](https://mermaid.live/)