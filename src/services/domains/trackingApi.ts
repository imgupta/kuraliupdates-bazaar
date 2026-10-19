/**
 * Shared tracking API boundary.
 *
 * This typed facade limits callers to the domain methods listed here while preserving
 * the existing shared transport, endpoint paths, auth headers, response mapping, and
 * error/fallback behavior. Move implementations behind this boundary incrementally.
 */
import { bazaarApi } from '../api';

export const trackingApi: Pick<typeof bazaarApi, 'getLiveTracking'> = bazaarApi;
