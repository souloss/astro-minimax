---
title: "数学公式示例"
description: "展示 KaTeX 数学公式渲染功能，支持行内公式和块级公式"
pubDatetime: 2024-01-04T00:00:00.000Z
tags:
  - 教程
  - 数学
---

## 行内公式

这是一个简单的行内公式 $E = mc^2$，爱因斯坦的质能方程。

勾股定理：直角三角形的两条直角边的平方和等于斜边的平方，即 $a^2 + b^2 = c^2$。

## 块级公式

### 二次方程求根公式

$$x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$$

### 欧拉公式

$$e^{i\pi} + 1 = 0$$

### 高斯积分

$$\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}$$

### 泰勒展开

$$f(x) = \sum_{n=0}^{\infty} \frac{f^{(n)}(a)}{n!}(x-a)^n$$

### 矩阵

$$
\begin{bmatrix}
1 & 2 & 3 \\
4 & 5 & 6 \\
7 & 8 & 9
\end{bmatrix}
$$

### 分段函数

$$
f(x) = \begin{cases}
x^2, & x \geq 0 \\
-x^2, & x < 0
\end{cases}
$$

### 麦克斯韦方程组

$$
\nabla \cdot \mathbf{E} = \frac{\rho}{\varepsilon_0}
$$

$$
\nabla \cdot \mathbf{B} = 0
$$

$$
\nabla \times \mathbf{E} = -\frac{\partial \mathbf{B}}{\partial t}
$$

$$
\nabla \times \mathbf{B} = \mu_0 \mathbf{J} + \mu_0 \varepsilon_0 \frac{\partial \mathbf{E}}{\partial t}
$$

## 复杂公式示例

### 傅里叶变换

$$\hat{f}(\xi) = \int_{-\infty}^{\infty} f(x) e^{-2\pi i x \xi} dx$$

### 薛定谔方程

$$i\hbar \frac{\partial}{\partial t} \Psi(\mathbf{r}, t) = \hat{H} \Psi(\mathbf{r}, t)$$

数学公式使用 [KaTeX](https://katex.org/) 渲染，支持绝大多数 LaTeX 语法。