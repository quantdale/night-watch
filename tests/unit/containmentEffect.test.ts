import { test, expect } from '@playwright/test';
import {
  classifyOptionalSupportConsoleEffect,
  EXPECTED_CONTAINMENT_EFFECT,
  OPTIONAL_SUPPORT_CLASSIFICATION,
} from '../../src/browser/observers/containmentEffect';

test('only a console message causally tied to an already-blocked exact support host is expected containment', () => {
  const blocked = new Set(['widget.usepylon.com']);
  expect(classifyOptionalSupportConsoleEffect('Pylon widget failed to load', undefined, blocked)).toMatchObject({
    host: 'widget.usepylon.com',
    classification: OPTIONAL_SUPPORT_CLASSIFICATION,
    reason: EXPECTED_CONTAINMENT_EFFECT,
  });
  expect(classifyOptionalSupportConsoleEffect('Failed to load resource', 'https://widget.usepylon.com/widget/synthetic-app-id', blocked)).toMatchObject({
    host: 'widget.usepylon.com',
    classification: OPTIONAL_SUPPORT_CLASSIFICATION,
    reason: EXPECTED_CONTAINMENT_EFFECT,
  });
});

test('Pylon-like console text and unrelated errors remain normal without the exact supported host', () => {
  expect(classifyOptionalSupportConsoleEffect('Pylon widget failed to load', undefined, new Set())).toBeNull();
  expect(classifyOptionalSupportConsoleEffect('unrelated application error', 'https://appdev.alphaus.cloud/ripple/', new Set(['widget.usepylon.com']))).toBeNull();
  expect(classifyOptionalSupportConsoleEffect('Pylon widget failed to load', undefined, new Set(['api.usepylon.com']))).toBeNull();
});
