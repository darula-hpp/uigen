export function getReadmeTemplate(projectName: string): string {
  return `# ${projectName}

This project was scaffolded with \`uigen init\`.

## Quick Start

1. **Start the development server:**
   \`\`\`bash
   uigen serve openapi.yaml
   \`\`\`

2. **Open the config GUI:**
   \`\`\`bash
   uigen config openapi.yaml
   \`\`\`

3. **Customize your theme:**
   Edit \`.uigen/theme.css\` to change colors, fonts, and styles.
   The base styles are in \`.uigen/base-styles.css\` (do not modify).

## Project Structure

- \`openapi.yaml\` - Your OpenAPI specification
- \`.uigen/config.yaml\` - UIGen configuration and annotations
- \`.uigen/base-styles.css\` - Base Tailwind CSS styles (do not modify)
- \`.uigen/theme.css\` - Your custom CSS overrides
- \`.agents/skills/\` - AI agent skills for automation

## AI Agent Skills

This project includes AI agent skills for:
- **Auto-annotation**: Automatically detect and apply annotations to your spec
- **Styling**: Generate custom CSS themes with AI assistance

To use these skills with an AI agent (like Kiro), simply reference them in your prompts.

### Auto-annotating your spec

To automatically detect and apply annotations to your OpenAPI spec, use your AI agent with the auto-annotate skill:

\`\`\`
Use the auto-annotate skill to analyze openapi.yaml and add appropriate annotations
\`\`\`

The skill will detect login endpoints, file uploads, foreign key references, and more.

## Next Steps

- [Read the documentation](https://uigen.dev/docs)
- [Learn about annotations](https://uigen.dev/docs/annotations)
- [Customize your theme](https://uigen.dev/docs/styling)
- [Deploy your app](https://uigen.dev/docs/deployment)

## Commands

- \`uigen serve openapi.yaml\` - Start development server
- \`uigen config openapi.yaml\` - Open configuration GUI
- \`uigen build openapi.yaml\` - Build for production (coming soon)

---

Generated with ❤️ by [UIGen](https://uigen.dev)
`;
}
