// Development environment - apiBaseUrl points to the backend via ingress.
// In Angular we cannot read process.env at runtime, so we mirror the
// REACT_APP_BACKEND_URL value from the platform env into a relative '/api'
// path that the dev-server proxies, OR use the public preview URL directly.
export const environment = {
  production: false,
  apiBaseUrl: 'https://a19070cb-fe62-4b36-94f8-fd6d4efe2d4a.preview.emergentagent.com/api'
};
