import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getFontFamilyCss,
  getCornerRadiusClass,
  getDensityRowClass,
  clampSidebarWidth,
  clampFontScale,
  formatTimeDisplay,
  resolveSectionDrop,
} from './layoutMath.ts';

test('layoutMath: getFontFamilyCss maps family choices correctly', () => {
  assert.ok(getFontFamilyCss('sans').includes('Plus Jakarta Sans'));
  assert.ok(getFontFamilyCss('mono').includes('JetBrains Mono'));
  assert.ok(getFontFamilyCss('space').includes('Space Grotesk'));
  assert.ok(getFontFamilyCss('serif').includes('Playfair Display'));
  assert.ok(getFontFamilyCss('system').includes('system-ui'));
});

test('layoutMath: getCornerRadiusClass returns appropriate tailwind class', () => {
  assert.equal(getCornerRadiusClass('none'), 'rounded-none');
  assert.equal(getCornerRadiusClass('subtle'), 'rounded-md');
  assert.equal(getCornerRadiusClass('rounded'), 'rounded-xl');
  assert.equal(getCornerRadiusClass('pill'), 'rounded-3xl');
});

test('layoutMath: getDensityRowClass provides proportional styles', () => {
  assert.equal(getDensityRowClass('compact').py, 'py-1.5');
  assert.equal(getDensityRowClass('standard').py, 'py-2.5');
  assert.equal(getDensityRowClass('spacious').py, 'py-3.5');
});

test('layoutMath: clampSidebarWidth bounds between 180 and 320', () => {
  assert.equal(clampSidebarWidth(100), 180);
  assert.equal(clampSidebarWidth(240), 240);
  assert.equal(clampSidebarWidth(500), 320);
});

test('layoutMath: clampFontScale bounds scale between 80 and 140', () => {
  assert.equal(clampFontScale(50), 80);
  assert.equal(clampFontScale(100), 100);
  assert.equal(clampFontScale(200), 140);
});

test('layoutMath: formatTimeDisplay formats elapsed-remaining, milliseconds, and percent', () => {
  assert.deepEqual(formatTimeDisplay(60, 180, 'elapsed-total'), { left: '1:00', right: '3:00' });
  assert.deepEqual(formatTimeDisplay(60, 180, 'elapsed-remaining'), { left: '1:00', right: '-2:00' });
  assert.deepEqual(formatTimeDisplay(90, 180, 'percent'), { left: '50%', right: '3:00' });
  const ms = formatTimeDisplay(65.42, 120, 'milliseconds');
  assert.equal(ms.left, '1:05.42');
});

test('layoutMath: resolveSectionDrop moves navigation to top tabs and player to sidebar', () => {
  assert.deepEqual(resolveSectionDrop('navigation', 'top'), { sidebarPosition: 'top' });
  assert.deepEqual(resolveSectionDrop('navigation', 'right'), { sidebarPosition: 'right' });
  assert.deepEqual(resolveSectionDrop('player', 'left'), { playerBarPosition: 'left' });
  assert.deepEqual(resolveSectionDrop('player', 'right'), { playerBarPosition: 'right' });
  assert.deepEqual(resolveSectionDrop('player', 'top'), { playerBarPosition: 'top' });
});
