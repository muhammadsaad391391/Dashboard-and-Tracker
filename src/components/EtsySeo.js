import { renderCategoryTracker } from './CategoryTracker.js';
import { icons } from '../icons.js';

export function renderEtsySeo(container, state) {
  renderCategoryTracker(container, state, 'etsy-seo', 'Etsy + SEO', 'etsy_seo', icons.etsy);
}
