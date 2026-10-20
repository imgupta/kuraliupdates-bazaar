/**
 * Backwards-compatible API facade.
 *
 * New code should import a domain API directly. This facade intentionally keeps
 * the established bazaarApi method names available while callers migrate.
 */
import { authApi } from './domains/authApi';
import { buyerOrdersApi } from './domains/buyerOrdersApi';
import { catalogApi } from './domains/catalogApi';

export { API_BASE_URL } from './http/apiConfig';
export type { BackendHealthResponse, BackendProduct } from './apiTypes';

export const bazaarApi = {
  ...authApi,
  ...catalogApi,
  ...buyerOrdersApi,
};
