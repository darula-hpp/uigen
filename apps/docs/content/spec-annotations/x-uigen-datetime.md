---
title: x-uigen-datetime
description: Configure datetime field formatting and input controls
---

# x-uigen-datetime

The `x-uigen-datetime` annotation allows you to configure how datetime fields are displayed and edited in your UIGen application. It provides control over format patterns, timezone handling, and automatic input control selection.

## Overview

Use `x-uigen-datetime` to:
- Specify custom datetime format patterns using dayjs syntax
- Control timezone display and conversion
- Automatically select appropriate HTML5 input controls (date, time, datetime-local)
- Support multiple datetime formats across different fields

## Syntax

The annotation accepts either a string (format pattern only) or an object (format + timezone):

```yaml
# Simple format (string)
x-uigen-datetime: "YYYY-MM-DD"

# Full configuration (object)
x-uigen-datetime:
  format: "MM/DD/YYYY hh:mm A"
  timezone: "America/New_York"
```

## Parameters

### format (required)

The dayjs format pattern for displaying and parsing datetime values.

**Type**: `string`

**Valid tokens**:
- **Year**: `YYYY` (4-digit), `YY` (2-digit)
- **Month**: `MM` (01-12), `M` (1-12), `MMM` (Jan-Dec), `MMMM` (January-December)
- **Day**: `DD` (01-31), `D` (1-31)
- **Hour**: `HH` (00-23), `H` (0-23), `hh` (01-12), `h` (1-12)
- **Minute**: `mm` (00-59), `m` (0-59)
- **Second**: `ss` (00-59), `s` (0-59)
- **Millisecond**: `SSS` (000-999), `SS` (00-99), `S` (0-9)
- **AM/PM**: `A` (AM/PM), `a` (am/pm)
- **Timezone**: `Z` (+05:00), `ZZ` (+0500)

**Valid separators**: `-`, `/`, `:`, space, `T`

### timezone (optional)

The IANA timezone identifier for timezone conversion.

**Type**: `string`

**Special values**:
- `"local"` - Use the user's browser timezone (default)
- `"utc"` or `"UTC"` - Use UTC timezone

**Examples**: `"America/New_York"`, `"Europe/London"`, `"Asia/Tokyo"`

## Input Control Detection

UIGen automatically selects the appropriate HTML5 input control based on your format pattern:

| Format Pattern | Input Control | Example |
|----------------|---------------|---------|
| Date only (YYYY, MM, DD) | `<input type="date">` | `"YYYY-MM-DD"` |
| Time only (HH, mm, ss) | `<input type="time">` | `"HH:mm:ss"` |
| Date + Time | `<input type="datetime-local">` | `"YYYY-MM-DD HH:mm"` |

## Examples

### ISO Date Format

```yaml
created_at:
  type: string
  format: date-time
  x-uigen-datetime: "YYYY-MM-DD"
```

### US Date Format

```yaml
birth_date:
  type: string
  x-uigen-datetime: "MM/DD/YYYY"
```

### European Date Format

```yaml
event_date:
  type: string
  x-uigen-datetime: "DD/MM/YYYY"
```

### 24-Hour Time

```yaml
meeting_time:
  type: string
  x-uigen-datetime: "HH:mm"
```

### 12-Hour Time with AM/PM

```yaml
appointment_time:
  type: string
  x-uigen-datetime: "hh:mm A"
```

### DateTime with Timezone

```yaml
scheduled_at:
  type: string
  format: date-time
  x-uigen-datetime:
    format: "MM/DD/YYYY hh:mm A"
    timezone: "America/New_York"
```

### Display Format

```yaml
published_at:
  type: string
  x-uigen-datetime: "MMM DD, YYYY"
  # Displays as: "Jan 15, 2021"
```

### Full DateTime

```yaml
timestamp:
  type: string
  x-uigen-datetime: "MMMM DD, YYYY hh:mm:ss A"
  # Displays as: "January 15, 2021 03:30:45 PM"
```

## Common Format Patterns

UIGen provides common format pattern constants in the core library:

```typescript
import { DateTimeFormats } from '@uigen-dev/core';

// ISO formats
DateTimeFormats.ISO_DATE              // "YYYY-MM-DD"
DateTimeFormats.ISO_DATETIME          // "YYYY-MM-DDTHH:mm:ss"
DateTimeFormats.ISO_DATETIME_TZ       // "YYYY-MM-DDTHH:mm:ssZ"

// US formats
DateTimeFormats.US_DATE               // "MM/DD/YYYY"
DateTimeFormats.US_DATE_SHORT         // "M/D/YY"
DateTimeFormats.US_DATETIME           // "MM/DD/YYYY hh:mm A"

// EU formats
DateTimeFormats.EU_DATE               // "DD/MM/YYYY"
DateTimeFormats.EU_DATE_SHORT         // "D/M/YY"
DateTimeFormats.EU_DATETIME           // "DD/MM/YYYY HH:mm"

// Time formats
DateTimeFormats.TIME_24H              // "HH:mm"
DateTimeFormats.TIME_24H_SECONDS      // "HH:mm:ss"
DateTimeFormats.TIME_12H              // "hh:mm A"
DateTimeFormats.TIME_12H_SECONDS      // "hh:mm:ss A"

// Display formats
DateTimeFormats.DISPLAY_DATE          // "MMM DD, YYYY"
DateTimeFormats.DISPLAY_DATETIME      // "MMM DD, YYYY HH:mm"
DateTimeFormats.DISPLAY_FULL          // "MMMM DD, YYYY hh:mm A"
```

## Timezone Handling

When a timezone is specified, UIGen:
1. Converts UTC values from the API to the specified timezone for display
2. Converts user input from the specified timezone back to UTC for API submission
3. Displays the timezone name below the input field

### Example with Timezone

```yaml
components:
  schemas:
    Event:
      type: object
      properties:
        start_time:
          type: string
          format: date-time
          x-uigen-datetime:
            format: "MM/DD/YYYY hh:mm A"
            timezone: "America/Los_Angeles"
```

**Display**:
```
┌─────────────────────────────┐
│ 01/15/2021 10:00 AM         │
└─────────────────────────────┘
Timezone: America/Los_Angeles
```

## API Format Conversion

By default, UIGen uses ISO 8601 format for API communication. You can specify a different API format using the `x-uigen-datetime-api-format` annotation:

```yaml
created_at:
  type: integer
  format: int64
  x-uigen-datetime: "MMM DD, YYYY"
  x-uigen-datetime-api-format: "unix"
  # API sends/receives Unix timestamps (seconds)
  # UI displays as "Jan 15, 2021"
```

See [x-uigen-datetime-api-format](./x-uigen-datetime-api-format.md) for more details.

## Validation

UIGen validates format patterns at compile time:
- Format must be a non-empty string
- Format must contain at least one valid dayjs token
- Invalid formats trigger a warning and are ignored

**Valid**:
```yaml
x-uigen-datetime: "YYYY-MM-DD"        # ✓
x-uigen-datetime: "MM/DD/YYYY HH:mm"  # ✓
x-uigen-datetime: "DD.MM.YYYY"        # ✓
```

**Invalid**:
```yaml
x-uigen-datetime: ""                  # ✗ Empty string
x-uigen-datetime: "abc"               # ✗ No valid tokens
x-uigen-datetime: 123                 # ✗ Not a string
```

## Config File Integration

You can set default datetime formats in your `.uigen/config.yaml`:

```yaml
defaults:
  x-uigen-datetime: "MM/DD/YYYY"
  x-uigen-datetime-tz: "America/New_York"
```

Spec annotations override config defaults.

## Backward Compatibility

Fields without `x-uigen-datetime` continue to use default date rendering. The annotation is optional and does not break existing specs.

## Browser Support

UIGen uses HTML5 datetime input controls, which are supported in:
- Chrome 20+
- Firefox 57+
- Safari 14.1+
- Edge 79+

For older browsers, the inputs fall back to text inputs with format validation.

## Related Annotations

- [x-uigen-datetime-tz](./x-uigen-datetime-tz.md) - Timezone configuration (alternative syntax)
- [x-uigen-datetime-api-format](./x-uigen-datetime-api-format.md) - API format specification
- [x-uigen-label](./x-uigen-label.md) - Custom field labels

## See Also

- [dayjs Format Documentation](https://day.js.org/docs/en/display/format)
- [IANA Timezone Database](https://www.iana.org/time-zones)
- [HTML5 Input Types](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input)
