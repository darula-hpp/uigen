---
title: x-uigen-datetime-tz
description: Configure timezone for datetime fields
---

# x-uigen-datetime-tz

The `x-uigen-datetime-tz` annotation allows you to specify the timezone for datetime field display and conversion. This is an alternative to specifying the timezone in the `x-uigen-datetime` object.

## Overview

Use `x-uigen-datetime-tz` to:
- Set the timezone independently from the format pattern
- Override timezone configuration from config files
- Display datetime values in specific timezones

## Syntax

```yaml
x-uigen-datetime-tz: "America/New_York"
```

## Parameters

### timezone (required)

The IANA timezone identifier for timezone conversion.

**Type**: `string`

**Special values**:
- `"local"` - Use the user's browser timezone (default)
- `"utc"` or `"UTC"` - Use UTC timezone

**Examples**: `"America/New_York"`, `"Europe/London"`, `"Asia/Tokyo"`, `"Australia/Sydney"`

## Examples

### US Eastern Time

```yaml
scheduled_at:
  type: string
  format: date-time
  x-uigen-datetime: "MM/DD/YYYY hh:mm A"
  x-uigen-datetime-tz: "America/New_York"
```

### European Time

```yaml
meeting_time:
  type: string
  x-uigen-datetime: "DD/MM/YYYY HH:mm"
  x-uigen-datetime-tz: "Europe/London"
```

### Asian Time

```yaml
event_start:
  type: string
  x-uigen-datetime: "YYYY-MM-DD HH:mm"
  x-uigen-datetime-tz: "Asia/Tokyo"
```

### UTC Time

```yaml
timestamp:
  type: string
  format: date-time
  x-uigen-datetime: "YYYY-MM-DD HH:mm:ss"
  x-uigen-datetime-tz: "UTC"
```

### Local Time

```yaml
local_time:
  type: string
  x-uigen-datetime: "HH:mm"
  x-uigen-datetime-tz: "local"
```

## Timezone Display

When a timezone is specified, UIGen displays the timezone name below the input field:

```
┌─────────────────────────────┐
│ 01/15/2021 10:00 AM         │
└─────────────────────────────┘
Timezone: America/New_York
```

For `"local"` timezone:

```
┌─────────────────────────────┐
│ 01/15/2021 10:00 AM         │
└─────────────────────────────┘
Timezone: Local
```

## Timezone Conversion

UIGen handles timezone conversion automatically:

1. **Loading Data**: Converts UTC values from API to specified timezone for display
2. **Submitting Data**: Converts user input from specified timezone back to UTC for API

### Example Flow

**API Response** (UTC):
```json
{
  "scheduled_at": "2021-01-15T15:00:00Z"
}
```

**Display** (America/New_York, EST = UTC-5):
```
01/15/2021 10:00 AM
Timezone: America/New_York
```

**User Edit**:
```
01/15/2021 11:00 AM
```

**API Request** (UTC):
```json
{
  "scheduled_at": "2021-01-15T16:00:00Z"
}
```

## Common Timezones

### North America

- `America/New_York` - Eastern Time (ET)
- `America/Chicago` - Central Time (CT)
- `America/Denver` - Mountain Time (MT)
- `America/Los_Angeles` - Pacific Time (PT)
- `America/Anchorage` - Alaska Time (AKT)
- `America/Honolulu` - Hawaii-Aleutian Time (HST)
- `America/Toronto` - Eastern Time (Canada)
- `America/Vancouver` - Pacific Time (Canada)

### Europe

- `Europe/London` - Greenwich Mean Time (GMT) / British Summer Time (BST)
- `Europe/Paris` - Central European Time (CET)
- `Europe/Berlin` - Central European Time (CET)
- `Europe/Rome` - Central European Time (CET)
- `Europe/Madrid` - Central European Time (CET)
- `Europe/Amsterdam` - Central European Time (CET)
- `Europe/Brussels` - Central European Time (CET)
- `Europe/Moscow` - Moscow Time (MSK)

### Asia

- `Asia/Tokyo` - Japan Standard Time (JST)
- `Asia/Shanghai` - China Standard Time (CST)
- `Asia/Hong_Kong` - Hong Kong Time (HKT)
- `Asia/Singapore` - Singapore Time (SGT)
- `Asia/Seoul` - Korea Standard Time (KST)
- `Asia/Dubai` - Gulf Standard Time (GST)
- `Asia/Kolkata` - India Standard Time (IST)
- `Asia/Bangkok` - Indochina Time (ICT)

### Australia

- `Australia/Sydney` - Australian Eastern Time (AET)
- `Australia/Melbourne` - Australian Eastern Time (AET)
- `Australia/Brisbane` - Australian Eastern Time (AET, no DST)
- `Australia/Perth` - Australian Western Time (AWT)
- `Australia/Adelaide` - Australian Central Time (ACT)

### Other

- `Pacific/Auckland` - New Zealand Time (NZST)
- `Africa/Johannesburg` - South Africa Standard Time (SAST)
- `America/Sao_Paulo` - Brasília Time (BRT)
- `America/Argentina/Buenos_Aires` - Argentina Time (ART)

## Validation

UIGen validates timezone identifiers at compile time:
- Timezone must be a valid IANA identifier or special value
- Invalid timezones trigger a warning and default to `"local"`

**Valid**:
```yaml
x-uigen-datetime-tz: "America/New_York"  # ✓
x-uigen-datetime-tz: "Europe/London"     # ✓
x-uigen-datetime-tz: "local"             # ✓
x-uigen-datetime-tz: "UTC"               # ✓
```

**Invalid**:
```yaml
x-uigen-datetime-tz: "EST"               # ✗ Use IANA identifier
x-uigen-datetime-tz: "GMT+5"             # ✗ Use IANA identifier
x-uigen-datetime-tz: ""                  # ✗ Empty string
x-uigen-datetime-tz: 123                 # ✗ Not a string
```

## Alternative Syntax

You can also specify timezone in the `x-uigen-datetime` object:

```yaml
# Using x-uigen-datetime-tz (separate annotation)
x-uigen-datetime: "MM/DD/YYYY hh:mm A"
x-uigen-datetime-tz: "America/New_York"

# Using x-uigen-datetime object (combined)
x-uigen-datetime:
  format: "MM/DD/YYYY hh:mm A"
  timezone: "America/New_York"
```

Both syntaxes are equivalent. Use whichever is more convenient for your spec.

## Config File Integration

You can set a default timezone in your `.uigen/config.yaml`:

```yaml
defaults:
  x-uigen-datetime-tz: "America/New_York"
```

Spec annotations override config defaults.

## Daylight Saving Time

UIGen automatically handles daylight saving time (DST) transitions using the IANA timezone database. No special configuration is needed.

### Example

For `America/New_York`:
- **Winter** (EST): UTC-5
- **Summer** (EDT): UTC-4

UIGen automatically applies the correct offset based on the date.

## Browser Support

Timezone conversion is supported in all modern browsers that support the Intl API:
- Chrome 24+
- Firefox 29+
- Safari 10+
- Edge 12+

## Related Annotations

- [x-uigen-datetime](./x-uigen-datetime.md) - Datetime format configuration
- [x-uigen-datetime-api-format](./x-uigen-datetime-api-format.md) - API format specification

## See Also

- [IANA Timezone Database](https://www.iana.org/time-zones)
- [List of tz database time zones](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones)
- [dayjs Timezone Plugin](https://day.js.org/docs/en/plugin/timezone)
