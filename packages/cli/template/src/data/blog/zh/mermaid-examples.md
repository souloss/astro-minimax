---
title: "Mermaid 图表示例"
description: "展示 Mermaid 流程图、时序图、类图、状态图等 11 种图表类型"
pubDatetime: 2024-01-02T00:00:00.000Z
author: "Your Name"
tags:
  - 教程
  - Mermaid
category: 教程/工具
---

本文展示如何使用 ` ```mermaid ` 代码块语法创建各种 Mermaid 图表。

---

## 一、流程图 (Flowchart)

### 1.1 基本流程图

```mermaid
flowchart TD
    A[开始] --> B{条件判断}
    B -->|是| C[执行操作A]
    B -->|否| D[执行操作B]
    C --> E[结束]
    D --> E
```

### 1.2 横向流程图

```mermaid
flowchart LR
    A[用户请求] --> B[负载均衡]
    B --> C[服务器A]
    B --> D[服务器B]
    C --> E[(数据库)]
    D --> E
```

---

## 二、时序图 (Sequence Diagram)

```mermaid
sequenceDiagram
    participant 用户
    participant 前端
    participant 后端
    participant 数据库
    
    用户->>前端: 点击登录
    前端->>后端: POST /api/login
    后端->>数据库: 查询用户信息
    数据库-->>后端: 返回用户数据
    后端-->>前端: 返回 JWT Token
    前端-->>用户: 跳转到主页
```

---

## 三、类图 (Class Diagram)

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

## 四、状态图 (State Diagram)

```mermaid
stateDiagram-v2
    [*] --> 待处理
    待处理 --> 处理中: 开始处理
    处理中 --> 已完成: 处理成功
    处理中 --> 已取消: 处理失败
    已完成 --> [*]
    已取消 --> [*]
```

---

## 五、实体关系图 (ER Diagram)

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
        int order_id FK
        int product_id FK
        int quantity
    }
```

---

## 六、甘特图 (Gantt Chart)

```mermaid
gantt
    title 项目开发计划
    dateFormat YYYY-MM-DD
    section 设计阶段
    需求分析 :a1, 2024-01-01, 7d
    UI设计 :a2, after a1, 5d
    section 开发阶段
    前端开发 :b1, after a2, 14d
    后端开发 :b2, after a2, 14d
    section 测试阶段
    功能测试 :c1, after b1, 7d
    上线部署 :c2, after c1, 3d
```

---

## 七、饼图 (Pie Chart)

```mermaid
pie showData
    title 编程语言使用占比
    "TypeScript" : 35
    "Python" : 25
    "Go" : 20
    "Rust" : 12
    "Others" : 8
```

---

## 八、Git 图 (Git Graph)

```mermaid
gitGraph
    commit id: "初始化项目"
    commit id: "添加基础功能"
    branch develop
    checkout develop
    commit id: "开发中"
    commit id: "新功能A"
    checkout main
    merge develop id: "v1.0 发布" tag: "v1.0"
    commit id: "后续优化"
```

---

## 九、用户旅程图 (User Journey)

```mermaid
journey
    title 用户购物体验旅程
    section 浏览商品
        打开首页: 5: 用户
        搜索商品: 4: 用户
    section 购买流程
        加入购物车: 4: 用户
        结算付款: 3: 用户, 系统
    section 收货评价
        确认收货: 5: 用户
        评价商品: 4: 用户
```

---

## 十、思维导图 (Mindmap)

```mermaid
mindmap
  root((Web开发))
    前端
      HTML/CSS
      JavaScript
        TypeScript
        框架
          Vue
          React
    后端
      Node.js
      Python
      Go
    数据库
      MySQL
      MongoDB
      Redis
```

---

## 十一、样式定制

```mermaid
flowchart TD
    A[开始] --> B[处理]
    B --> C[结束]

    style A fill:#f9f,stroke:#333,stroke-width:2px
    style B fill:#bbf,stroke:#333,stroke-width:2px
    style C fill:#bfb,stroke:#333,stroke-width:2px
```

---

## 参考资料

- [Mermaid 官方文档](https://mermaid.js.org/)
- [Mermaid Live Editor](https://mermaid.live/)