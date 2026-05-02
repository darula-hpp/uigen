export function getThemeTemplate(): string {
  return `/* UIGen Custom Theme
 * 
 * This file allows you to customize the appearance of your generated app.
 * Override CSS variables or add custom styles below.
 * 
 * The base styles are in base-styles.css (do not modify that file).
 * Your custom styles here will override the base styles.
 * 
 * Learn more: https://uigen.dev/docs/styling
 */

/* Example: Custom brand colors
:root {
  --primary: #3b82f6;
  --primary-foreground: #ffffff;
}

.dark {
  --primary: #60a5fa;
  --primary-foreground: #000000;
}
*/
`;
}
