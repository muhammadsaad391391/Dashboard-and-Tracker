import { renderCategoryTracker } from './CategoryTracker.js';
import { icons } from '../icons.js';

export function renderStudy(container, state) {
  renderCategoryTracker(container, state, 'study', 'Study Hours', 'study', icons.study);
}
