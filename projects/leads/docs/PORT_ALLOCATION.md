# Port Allocation Standards

## Overview

Clear separation between AHL and non-AHL services using slot numbers.

## Port Formula (All Projects)

```
├── Landing:  3000 + slot
├── App:      4000 + slot
├── IDE:      4100 + slot
└── API:      8000 + slot
```

## Slot Allocation

| Range | Owner |
|-------|-------|
| 00-23 | AHL |
| 50+ | Non-AHL (Ridgefield, Butts Tech, etc.) |

## AHL Projects (Slots 00-23)

(See AHL documentation for full list)

## Non-AHL Projects (Slots 50+)

### leads (Slot 50)

| Service | Port | URL |
|---------|------|-----|
| Landing | 3050 | leads.mdo3d.com |
| App | 4050 | (future) |
| IDE | 4150 | (future) |
| API | 8050 | leadsapi.mdo3d.com |

### latarence.ai (Slot 51)

| Service | Port | URL |
|---------|------|-----|
| Landing | 3051 | latarence.ai, www.latarence.ai |
| App | 4051 | app.latarence.ai |
| IDE | 4151 | ide.latarence.ai |
| API | 8051 | api.latarence.ai |

## Quick Reference

```
AHL:      Slots 00-23
Non-AHL:  Slots 50+
Gap:      Slots 24-49 (buffer)
```
