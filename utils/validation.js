const MAX_NAME_LENGTH = 80;
const MAX_URL_LENGTH = 2_048;
const MAX_ICON_DATA_URL_LENGTH = 700_000;
const SAFE_ICON_DATA_URL = /^data:image\/(?:png|jpeg|webp|x-icon|vnd\.microsoft\.icon);base64,[a-z0-9+/=\r\n]+$/i;

function validateHttpsUrl(value, fieldName) {
  if (!value) {
    return `${fieldName} is required.`;
  }

  if (value.length > MAX_URL_LENGTH) {
    return `${fieldName} must be ${MAX_URL_LENGTH} characters or fewer.`;
  }

  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') {
      return `${fieldName} must use HTTPS.`;
    }

    if (url.username || url.password) {
      return `${fieldName} must not contain a username or password.`;
    }
  } catch {
    return `${fieldName} must be a valid URL.`;
  }

  return null;
}

export function isSafeIconDataUrl(value) {
  return typeof value === 'string'
    && value.length <= MAX_ICON_DATA_URL_LENGTH
    && SAFE_ICON_DATA_URL.test(value);
}

export function validateCustomEngine(input) {
  const value = {
    name: String(input.name ?? '').trim(),
    homeUrl: String(input.homeUrl ?? '').trim(),
    searchUrlTemplate: String(input.searchUrlTemplate ?? '').trim(),
    iconDataUrl: input.iconDataUrl || null,
  };
  const errors = {};

  if (!value.name) {
    errors.name = 'Display name is required.';
  } else if (value.name.length > MAX_NAME_LENGTH) {
    errors.name = `Display name must be ${MAX_NAME_LENGTH} characters or fewer.`;
  }

  const homeUrlError = validateHttpsUrl(value.homeUrl, 'Home URL');
  if (homeUrlError) {
    errors.homeUrl = homeUrlError;
  }

  const placeholderCount = value.searchUrlTemplate.split('{query}').length - 1;
  if (!value.searchUrlTemplate) {
    errors.searchUrlTemplate = 'Search URL template is required.';
  } else if (placeholderCount !== 1) {
    errors.searchUrlTemplate = 'Search URL template must contain exactly one literal {query} placeholder.';
  } else {
    const complexProbe = encodeURIComponent('privacidade café & "pesquisa livre" 世界');
    const templateProbe = value.searchUrlTemplate.replace('{query}', complexProbe);
    const searchUrlError = validateHttpsUrl(templateProbe, 'Search URL template');
    const placeholderIndex = value.searchUrlTemplate.indexOf('{query}');
    const authorityStart = value.searchUrlTemplate.indexOf('://') + 3;
    const authorityEndCandidates = ['/', '?', '#']
      .map((separator) => value.searchUrlTemplate.indexOf(separator, authorityStart))
      .filter((index) => index >= 0);
    const authorityEnd = authorityEndCandidates.length
      ? Math.min(...authorityEndCandidates)
      : value.searchUrlTemplate.length;

    if (!/^https:\/\//i.test(value.searchUrlTemplate) && searchUrlError) {
      errors.searchUrlTemplate = searchUrlError;
    } else if (authorityStart < 3 || placeholderIndex < authorityEnd) {
      errors.searchUrlTemplate = 'The {query} placeholder must appear after the URL hostname.';
    } else if (searchUrlError) {
      errors.searchUrlTemplate = searchUrlError;
    }
  }

  if (value.iconDataUrl && !isSafeIconDataUrl(value.iconDataUrl)) {
    errors.iconDataUrl = 'The custom icon must be a locally processed PNG, JPEG, WebP, or ICO image.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    value,
  };
}
