export function getExampleSpecTemplate(): string {
  return `openapi: 3.0.0
info:
  title: Example API
  version: 1.0.0
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
