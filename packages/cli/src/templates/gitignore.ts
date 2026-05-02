export function getGitignoreTemplate(): string {
  return `# Dependencies
node_modules/

# UIGen
annotations.json

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo
`;
}
