---
name: ios-order
description: >-
  Order food/drinks (点餐) on an iOS device paired as an OpenClaw node.
  Uses in-app menu and cart; add goods, view cart, submit order (demo, no real payment).
  Optimized for iOS interface and user experience.
  在配对的iOS设备上进行点餐。使用应用内菜单和购物车；添加商品、查看购物车、提交订单（演示，无真实支付）。
  针对iOS界面和用户体验进行了优化。
version: 1.0.0
user-invocable: true

metadata:
  openclaw:
    capabilities: ["order", "ios"]
    commands:
      - name: order.getGoods
        description: Get the menu / goods list (id, name, price). 获取菜单/商品列表（ID、名称、价格）。
        params: []
      - name: order.getSelectedGoods
        description: Get current cart / selected items. 获取当前购物车/已选商品。
        params: []
      - name: order.addGoods
        description: Add a product to the cart by id or name (fuzzy). Default quantity 1. 通过ID或名称（模糊匹配）将商品添加到购物车。默认数量为1。
        params:
          - name: id
            type: string
            description: Goods ID from the menu (e.g. "101"). 菜单中的商品ID（例如"101"）。
          - name: name
            type: string
            description: Goods name, supports fuzzy match (e.g. "Latte", "Americano"). 商品名称，支持模糊匹配（例如"Latte"、"Americano"）。
          - name: quantity
            type: string
            description: Quantity, default "1". 数量，默认为"1"。
      - name: order.removeGoods
        description: Remove a product from the cart by id or name. 通过ID或名称从购物车中移除商品。
        params:
          - name: id
            type: string
            description: Goods ID. 商品ID。
          - name: name
            type: string
            description: Goods name (fuzzy). 商品名称（模糊匹配）。
          - name: quantity
            type: string
            description: Quantity to remove, default "1". 要移除的数量，默认为"1"。
      - name: order.clearGoods
        description: Clear all items in the cart. 清空购物车中的所有商品。
        params: []
      - name: order.submitOrder
        description: Submit the current cart as an order (demo; no real payment). 将当前购物车作为订单提交（演示；无真实支付）。
        params: []
      - name: order.batchAddGoods
        description: Add multiple items at once. list is JSON array [{"id":"101","quantity":2},...]. 一次性添加多个商品。list为JSON数组[{"id":"101","quantity":2},...]。
        params:
          - name: list
            type: string
            description: JSON array of objects with id and quantity. 包含id和quantity的JSON对象数组。
      - name: order.applyPromoCode
        description: Apply a promotional code to the cart for discount (demo). 为购物车应用促销码以享受折扣（演示）。
        params:
          - name: code
            type: string
            description: Promo code (e.g. "WELCOME10"). 促销码（例如"WELCOME10"）。
      - name: order.getOrderHistory
        description: Get recent order history (demo data). 获取近期订单历史（演示数据）。
        params: []
---

# iOS Order Skill (点餐)

This skill uses the paired iOS device (`OpenClaw iOS Demo` app with order capability) to manage an in-app menu and cart: get menu, add/remove items, view cart, submit order, apply promo codes, and view order history. Designed with iOS-specific UI/UX patterns; implementation is in-memory on the device (demo, no real POS backend).

此技能使用配对的iOS设备（具有点餐功能的`OpenClaw iOS Demo`应用）来管理应用内菜单和购物车：获取菜单、添加/移除商品、查看购物车、提交订单、应用促销码和查看订单历史。采用iOS特定的UI/UX模式设计；在设备上实现内存存储（演示，无真实POS后端）。

## When to use this skill (何时使用此技能)

- User asks to order food/drinks, view menu, add to cart, or submit an order on the paired iOS device: use the `order.*` commands below. 用户要求在配对的iOS设备上点餐、查看菜单、添加到购物车或提交订单：使用下面的`order.*`命令。
- User wants to apply a promo code or check order history on iOS. 用户想要在iOS上应用促销码或查看订单历史。

## Commands overview (命令概述)

| Command | Description |
|--------|-------------|
| `order.getGoods` | Return menu (id, name, priceCents, price). |
| `order.getSelectedGoods` | Return current cart with quantities and subtotals. |
| `order.addGoods` | Add by `id` or `name` (and optional `quantity`). |
| `order.removeGoods` | Remove by `id` or `name` (and optional `quantity`). |
| `order.clearGoods` | Clear cart. |
| `order.submitOrder` | Submit cart as order; returns summary (demo only). |
| `order.batchAddGoods` | Add multiple items: `list` = `[{"id":"101","quantity":2},...]`. |
| `order.applyPromoCode` | Apply promo code for discount. |
| `order.getOrderHistory` | Get recent orders (demo data). |

## How to call the underlying commands (如何调用底层命令)

Invoke via the OpenClaw gateway node invoke API:

- **command**: one of `order.getGoods`, `order.getSelectedGoods`, `order.addGoods`, `order.removeGoods`, `order.clearGoods`, `order.submitOrder`, `order.batchAddGoods`, `order.applyPromoCode`, `order.getOrderHistory`.
- **paramsJSON**: JSON object string, or `null` for no-param commands.

### order.getGoods

- `command`: `"order.getGoods"`
- `paramsJSON`: `null` or `"{}"`
- Success: payload is a JSON array of `{ "id", "name", "priceCents", "price", "category" }`.
- Includes `category` field (e.g., "Coffee", "Food", "Dessert").

### order.getSelectedGoods

- `command`: `"order.getSelectedGoods"`
- `paramsJSON`: `null` or `"{}"`
- Success: payload is a JSON array of cart items with `id`, `name`, `quantity`, `priceCents`, `subtotalCents`, `discountCents` (if promo applied).

### order.addGoods

- `command`: `"order.addGoods"`
- `paramsJSON`: provide **id** or **name** (or both); optional **quantity** (default 1).

  ```json
  { "id": "101", "quantity": "2" }
  ```
  or
  ```json
  { "name": "Latte", "quantity": "1" }
  ```

- Success: payload includes `success: true` and `message` (e.g. "Added Latte x1").

### order.removeGoods

- `command`: `"order.removeGoods"`
- `paramsJSON`: same shape as addGoods (`id` or `name`, optional `quantity`).

### order.clearGoods

- `command`: `"order.clearGoods"`
- `paramsJSON`: `null` or `"{}"`.

### order.submitOrder

- `command`: `"order.submitOrder"`
- `paramsJSON`: `null` or `"{}"`.
- Success: payload includes `success`, `message`, `totalCents`, `discountCents`, `finalCents`, `items`, `orderId`. Cart is cleared after submit.
- Error: `CART_EMPTY` if cart is empty.

### order.batchAddGoods

- `command`: `"order.batchAddGoods"`
- `paramsJSON`: `{ "list": "[{\"id\":\"101\",\"quantity\":2},{\"id\":\"102\",\"quantity\":1}]" }`
- Success: payload includes `success` and `message` (e.g. "Batch added 2 items").

### order.applyPromoCode

- `command`: `"order.applyPromoCode"`
- `paramsJSON`: `{ "code": "WELCOME10" }`
- Success: payload includes `success`, `message`, `discountPercent`, `discountCents`.
- Error: `INVALID_PROMO_CODE` if code not recognized.

### order.getOrderHistory

- `command`: `"order.getOrderHistory"`
- `paramsJSON`: `null` or `"{}"`.
- Success: payload is a JSON array of past orders with `orderId`, `timestamp`, `totalCents`, `itemCount`.

## Error handling (错误处理)

- **GOODS_NOT_FOUND**: No menu item matched the given id or name. Suggest calling `order.getGoods` to see the menu. 未找到与给定ID或名称匹配的菜单项。建议调用`order.getGoods`查看菜单。
- **NOT_IN_CART**: Item not in cart when removing. 移除时商品不在购物车中。
- **CART_EMPTY**: Cannot submit when cart is empty. 购物车为空时无法提交。
- **INVALID_REQUEST**: Missing or malformed params (e.g. empty `list` for batchAddGoods). 参数缺失或格式错误（例如batchAddGoods的`list`为空）。
- **INVALID_PROMO_CODE**: Promo code not valid or expired. 促销码无效或已过期。

## Demo menu (default on iOS device) (演示菜单)

The in-app menu includes items such as: 应用内菜单包含以下商品：

| ID  | Name | Category | Price (USD) |
|-----|------|----------|-------------|
| 101 | Latte | Coffee | $4.50 |
| 102 | Cappuccino | Coffee | $4.75 |
| 103 | Americano | Coffee | $3.50 |
| 104 | Espresso | Coffee | $3.00 |
| 201 | Croissant | Food | $3.25 |
| 202 | Sandwich | Food | $8.50 |
| 203 | Salad | Food | $9.00 |
| 301 | Cheesecake | Dessert | $6.00 |
| 302 | Chocolate Cake | Dessert | $5.50 |

Use `order.getGoods` to get the current list and prices.

## iOS-specific features (iOS专属特性)

- **Native UI integration**: Commands trigger native iOS alerts and confirmations when appropriate. 原生UI集成：命令在适当时触发iOS原生提示和确认。
- **Haptic feedback**: Successful actions provide subtle haptic feedback on supported devices. 触觉反馈：成功操作在支持的设备上提供微妙的触觉反馈。
- **Dark mode support**: Menu and cart display adapt to system appearance settings. 深色模式支持：菜单和购物车显示适配系统外观设置。
- **Apple Pay simulation**: Submit order shows Apple Pay sheet simulation (demo only). Apple Pay模拟：提交订单显示Apple Pay界面模拟（仅演示）。

## Safety notes (安全说明)

- This is a demo flow: submit order does not charge or send to a real POS. Do not expose as real payment. 这是一个演示流程：提交订单不会扣款或发送到真实POS。请勿作为真实支付暴露。
- Promo codes are for demonstration only and do not represent real discounts. 促销码仅用于演示，不代表真实折扣。
- Prefer confirming with the user before submitting an order (e.g. read back cart and total). 提交订单前最好与用户确认（例如，复述购物车内容和总价）。
- Order history is stored locally on device and cleared when app is reinstalled. 订单历史存储在设备本地，重新安装应用时会被清除。