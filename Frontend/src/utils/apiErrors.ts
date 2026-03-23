import type { TranslationKey } from './translations';

interface ParsedApiError {
  detailCode?: string;
  detail?: string;
}

type TranslateFn = (key: TranslationKey) => string;

const API_ERROR_CODE_TO_TRANSLATION: Partial<Record<string, TranslationKey>> = {
  ADMIN_LAST_ACTIVE_DEACTIVATION_FORBIDDEN: 'errors.admin.lastActiveDeactivationForbidden',
  AUTH_REQUIRED: 'errors.auth.required',
  UNAUTHORIZED: 'errors.auth.required',
  FORBIDDEN: 'errors.auth.forbidden',
  VALIDATION_ERROR: 'errors.validation.message',
  CART_LOAD_FAILED: 'cart.loadFailed',
  CART_ADD_FAILED: 'cart.addFailed',
  CART_REMOVE_FAILED: 'cart.removeFailed',
  FAVORITES_PRODUCTS_LOAD_FAILED: 'favorites.loadFailed',
  FAVORITES_STORES_LOAD_FAILED: 'favorites.loadFailed',
  VALIDATION_SEARCH_QUERY_EMPTY: 'errors.validation.searchQueryEmpty',
  VALIDATION_PAGE_NUMBER_INVALID: 'errors.validation.pagePositive',
  VALIDATION_PER_PAGE_RANGE: 'errors.validation.perPageRange',
  VALIDATION_DATE_FORMAT_INVALID: 'errors.validation.dateFormat',
  VALIDATION_DATE_INVALID: 'errors.validation.dateInvalid',
  VALIDATION_CHAIN_CODE_LENGTH_INVALID: 'errors.validation.chainCodeLength',
  VALIDATION_CHAIN_CODE_FORMAT_INVALID: 'errors.validation.chainCodeFormat',
  VALIDATION_EAN_REQUIRED: 'errors.validation.eanRequired',
  CHAIN_NOT_FOUND: 'errors.chain.notFound',
  ARCHIVE_NOT_FOUND: 'errors.archives.notFound',
  ARCHIVE_NONE_AVAILABLE: 'errors.archives.noneAvailable',
  NETWORK_UNAVAILABLE: 'errors.network.message',
  API_GENERIC: 'errors.server.message',
  SERVICE_GENERIC: 'errors.unexpected',
};

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (typeof value === 'object' && value !== null) {
    return value as Record<string, unknown>;
  }
  return null;
};

const asString = (value: unknown): string | undefined => {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
};

const getErrorCode = (error: unknown): string | undefined => {
  if (typeof error !== 'object' || error === null) {
    return undefined;
  }

  const maybeCode = (error as { code?: unknown }).code;
  return asString(maybeCode);
};

export const parseApiErrorPayload = (payload: unknown): ParsedApiError => {
  const root = asRecord(payload);
  if (!root) {
    return {};
  }

  const topLevelCode = asString(root.detail_code);
  const topLevelMessage = asString(root.message);

  const detailValue = root.detail;
  const detailAsText = asString(detailValue);
  const detailAsObject = asRecord(detailValue);

  const nestedCode = detailAsObject ? asString(detailAsObject.detail_code) : undefined;
  const nestedMessage = detailAsObject ? asString(detailAsObject.detail) : undefined;

  return {
    detailCode: topLevelCode ?? nestedCode,
    detail: detailAsText ?? nestedMessage ?? topLevelMessage,
  };
};

export class LocalizedApiError extends Error {
  public detailCode?: string;
  public fallbackDetail?: string;

  constructor(detailCode?: string, fallbackDetail?: string) {
    super(fallbackDetail ?? 'Request failed.');
    this.name = 'LocalizedApiError';
    this.detailCode = detailCode;
    this.fallbackDetail = fallbackDetail;
  }
}

export const createLocalizedApiErrorFromPayload = (
  payload: unknown,
  fallbackDetail?: string,
): LocalizedApiError => {
  const parsed = parseApiErrorPayload(payload);
  return new LocalizedApiError(parsed.detailCode, parsed.detail ?? fallbackDetail);
};

export const resolveApiErrorMessage = (
  error: unknown,
  t: TranslateFn,
  fallbackKey: TranslationKey,
): string => {
  const genericCode = getErrorCode(error);
  if (genericCode) {
    const translationKey = API_ERROR_CODE_TO_TRANSLATION[genericCode];
    if (translationKey) {
      return t(translationKey);
    }
  }

  if (error instanceof LocalizedApiError) {
    const translationKey = error.detailCode ? API_ERROR_CODE_TO_TRANSLATION[error.detailCode] : undefined;
    if (translationKey) {
      return t(translationKey);
    }

    if (error.fallbackDetail) {
      return error.fallbackDetail;
    }

    return t(fallbackKey);
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return t(fallbackKey);
};
