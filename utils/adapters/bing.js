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
});
