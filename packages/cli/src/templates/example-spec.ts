export function getExampleSpecTemplate(projectName: string = 'Example API'): string {
  return `openapi: 3.0.0
info:
  title: ${projectName}
  version: 1.0.0
  description: API for ${projectName}

# Application configuration
# Configure your app's name and icon for branding
x-uigen-app:
  # Custom application name (optional, defaults to info.title above)
  name: "${projectName}"
  
  # Application icon URL or path (optional)
  # Uncomment and customize after adding your icon to .uigen/assets/
  # The icon will appear in the browser tab (favicon) and application header
  # icon: "/.uigen/assets/logo.svg"

servers:
  - url: http://localhost:8000
paths:
  /users:
    get:
      summary: List users
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/User'
components:
  schemas:
    User:
      type: object
      properties:
        id:
          type: integer
        name:
          type: string
        email:
          type: string
`;
}
