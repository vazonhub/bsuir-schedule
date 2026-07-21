import { buildLabel, buttonA11y, getColorNameKey, headerA11y, luminance } from '@utils/a11y';

describe('buildLabel', () => {
  it('joins truthy parts with commas', () => {
    expect(buildLabel('Лекция', 'Математика', '08:00–09:35')).toBe(
      'Лекция, Математика, 08:00–09:35',
    );
  });

  it('drops null / undefined / false / 0 / empty parts', () => {
    expect(buildLabel('A', null, undefined, false, 0, '', 'B')).toBe('A, B');
  });

  it('returns an empty string when nothing is truthy', () => {
    expect(buildLabel(null, undefined, false)).toBe('');
  });
});

describe('buttonA11y', () => {
  it('sets the button role and label', () => {
    expect(buttonA11y('Открыть')).toEqual({
      accessibilityRole: 'button',
      accessibilityLabel: 'Открыть',
    });
  });

  it('includes the hint only when provided', () => {
    expect(buttonA11y('Открыть', 'Дважды коснитесь')).toEqual({
      accessibilityRole: 'button',
      accessibilityLabel: 'Открыть',
      accessibilityHint: 'Дважды коснитесь',
    });
  });
});

describe('headerA11y', () => {
  it('sets the header role and label', () => {
    expect(headerA11y('Понедельник')).toEqual({
      accessibilityRole: 'header',
      accessibilityLabel: 'Понедельник',
    });
  });
});

describe('getColorNameKey', () => {
  it('maps a known hex to its i18n key (case-insensitive)', () => {
    expect(getColorNameKey('#FF3B30')).toBe('color.red');
    expect(getColorNameKey('#0a84ff')).toBe('color.blue');
  });

  it('returns the raw hex for an unknown color', () => {
    expect(getColorNameKey('#abcdef')).toBe('#abcdef');
  });
});

describe('luminance', () => {
  it('is 0 for black and 1 for white', () => {
    expect(luminance('#000000')).toBeCloseTo(0);
    expect(luminance('#ffffff')).toBeCloseTo(1);
  });

  it('ranks a light color above a dark one', () => {
    expect(luminance('#ffcc00')).toBeGreaterThan(luminance('#1c1c1e'));
  });
});
