# Milkow Dashboard Redesign (Black & White)

## Goal

Redesign the dashboard into a premium monochrome interface that improves readability, information hierarchy, and usability while keeping interactions simple for dairy delivery staff.

---

# Design Principles

* Monochrome first
* Large typography for operational data
* Minimal visual noise
* Information over decoration
* Consistent spacing
* One primary action per section
* Accessibility-first contrast

---

# Color System

## Background

| Token       | Value   |
| ----------- | ------- |
| Background  | #FAFAFA |
| Surface     | #FFFFFF |
| Surface Alt | #F5F5F5 |

## Text

| Token     | Value   |
| --------- | ------- |
| Primary   | #111111 |
| Secondary | #666666 |
| Disabled  | #A0A0A0 |

## Borders

| Token   | Value   |
| ------- | ------- |
| Border  | #E8E8E8 |
| Divider | #EFEFEF |

## Interactive

| Token            | Value   |
| ---------------- | ------- |
| Primary          | #111111 |
| On Primary       | #FFFFFF |
| Selected Surface | #111111 |
| Selected Text    | #FFFFFF |

---

# Typography

## Display

36px
Bold

Used for:

* Stock count
* Money
* Delivered count

---

## Heading

22px
Semibold

Used for:

* Product Name
* Greeting

---

## Body

16px
Medium

Used for:

* Labels
* Navigation

---

## Caption

13px

Color

#666666

Used for:

* Secondary information
* Metadata

---

# Spacing

| Token | Value |
| ----- | ----- |
| XS    | 4     |
| S     | 8     |
| M     | 16    |
| L     | 24    |
| XL    | 32    |

Corner Radius

16px

Card Padding

20px

---

# Screen Layout

```
Header

Date Selector

Shift Selector

Today's Summary

Inventory

Delivered

Financial

Bottom Navigation
```

---

# Header

```
[S]

Good Evening

Sayas R.

⋮
```

Keep minimal.

---

# Date Card

```
📅

26 June 2026

Friday

Tap to change
```

Entire card clickable.

White background.

Thin border.

---

# Shift Selector

```
Morning | Evening
```

Selected

Black background

White text

Unselected

White background

Black text

---

# Today's Summary

Four compact cards.

```
Orders

128
```

```
Delivered

112
```

```
Pending

16
```

```
Customers

250
```

Large numbers.

No icons necessary.

---

# Inventory

Cards should be white.

```
Milk 1L

9 Bottles

███████░░

Loaded
10 Bottles
```

Rules

* Product name at top
* Large stock number
* Thin progress indicator
* Metadata at bottom
* Entire card tappable

Do not use dark cards.

---

# Delivered

Single metric card.

```
Delivered

42

Bottles
```

Use same style as inventory.

---

# Financial

Use identical cards.

Example

```
₹104,280

To Collect

250 Customers
```

```
₹228

Customer Advance

Total Credit
```

```
₹33

Today's Sales
```

```
₹0

Today's Payments
```

No colored pills.

No gradients.

---

# Card Design

Background

White

Border

1px

Shadow

None

Radius

16px

Padding

20px

---

# Navigation

```
Home

Inventory

Customers

Delivery
```

White background.

Thin top border.

Selected icon

Black

Inactive

Gray

---

# Interaction States

## Tap

Scale

98%

Duration

120ms

---

## Loading

Skeleton cards.

Avoid spinners whenever possible.

---

## Empty State

```
No inventory loaded

Load products to begin.
```

---

## Offline

```
Offline

Showing local data
```

Persistent banner.

---

## Sync

Top banner

```
✓ Synced

2 minutes ago
```

or

```
Uploading...

3 pending changes
```

---

# Accessibility

Minimum touch target

48×48

Contrast

WCAG AA

Font

Minimum 14px

Never communicate status using color alone.

---

# Figma Auto Layout

```
Frame

Vertical

Spacing 24

↓

Header

↓

Date

↓

Shift

↓

Summary Grid

↓

Inventory Grid

↓

Delivered

↓

Financial Grid

↓

Bottom Navigation
```

---

# Expected Outcome

* Cleaner monochrome appearance
* Better scanability
* Reduced cognitive load
* Stronger hierarchy
* Faster task completion for delivery staff
* Easier future expansion using a consistent design system
