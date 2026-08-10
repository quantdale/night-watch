import { test, expect } from '@playwright/test';
import {
  classifyBrowserBackgroundConsoleEffect,
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

test('browser-background console effects require an exact already-blocked host and preserve category', () => {
  const blocked = new Map([
    ['android.clients.google.com', 'BROWSER_BACKGROUND_GOOGLE'],
    ['update.googleapis.com', 'BROWSER_BACKGROUND_UPDATE'],
    ['redirector.gvt1.com', 'BROWSER_BACKGROUND_DOWNLOAD'],
  ] as const);
  expect(classifyBrowserBackgroundConsoleEffect(
    'browser background request failed: https://android.clients.google.com/generate_204',
    undefined,
    blocked
  )).toMatchObject({
    host: 'android.clients.google.com',
    classification: 'BROWSER_BACKGROUND_GOOGLE',
    hostClass: 'browser-background-google',
    reason: EXPECTED_CONTAINMENT_EFFECT,
  });
  expect(classifyBrowserBackgroundConsoleEffect(
    'Failed to load resource',
    'https://redirector.gvt1.com/edgedl/chrome/dict/1.bdic',
    blocked
  )).toMatchObject({
    host: 'redirector.gvt1.com',
    classification: 'BROWSER_BACKGROUND_DOWNLOAD',
    reason: EXPECTED_CONTAINMENT_EFFECT,
  });
  expect(classifyBrowserBackgroundConsoleEffect(
    'browser background request failed: https://redirector.gvt2.com/edgedl/chrome/dict/1.bdic',
    undefined,
    blocked
  )).toBeNull();
  expect(classifyBrowserBackgroundConsoleEffect('unrelated error', undefined, blocked)).toBeNull();
});
