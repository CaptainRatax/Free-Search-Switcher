import { createAdapter } from './shared.js';

export const bingAdapter = createAdapter({
  id: 'bing',
  hostname: 'www.bing.com',
  queryParameters: ['q'],
  formSelectors: [
    'form#sb_form',
    '[role="search"].b_searchboxForm',
    'form[role="search"]',
    'form[action*="/search"]',
  ],
  inputSelectors: [
    'form#sb_form textarea[name="q"]',
    'input#sb_form_q',
    'textarea#sb_form_q',
    'input[name="q"]',
    'textarea[name="q"]',
  ],
  navigationBehavior: 'full-page and client-side result updates',
  notes: 'Stable sb_form and sb_form_q IDs are preferred before semantic fallbacks.',
  // Matches both the results path (e.g. /images/search) and the confirmed-stable
  // per-mode homepage (e.g. /images) so a mode is preserved even without a query.
  detectMode(url) {
    const path = url.pathname;
    if (path.startsWith('/images')) {
      return 'images';
    }
    if (path.startsWith('/videos')) {
      return 'videos';
    }
    if (path.startsWith('/news')) {
      return 'news';
    }
    if (path.startsWith('/maps')) {
      return 'maps';
    }
    if (path.startsWith('/shop')) {
      return 'shopping';
    }
    return 'web';
  },
});
