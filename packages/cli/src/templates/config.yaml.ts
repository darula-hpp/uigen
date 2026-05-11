export function getConfigTemplate(): string {
  return `version: '1.0'
enabled: {}
defaults: {}
annotations: {}

# Environment Variables
# You can reference environment variables using \${ENV_VAR_NAME} syntax
# This is useful for sensitive values like OAuth credentials that shouldn't be committed to version control
#
# Example OAuth configuration with environment variables:
# annotations:
#   document:
#     x-uigen-auth:
#       providers:
#         - provider: google
#           # Use environment variables for sensitive OAuth credentials
#           clientId: \${GOOGLE_CLIENT_ID}
#           redirectUri: \${GOOGLE_REDIRECT_URI}
#           # Use literal values for non-sensitive config
#           scopes:
#             - openid
#             - email
#             - profile
`;
}
