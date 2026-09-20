Implementation is explicitly outside the planning-only audit campaign that created this change. These tasks are declared not in scope for the current task; none has been performed.

## 1. Establish exact credential-use authority

- [ ] ~~1.1 In a separately authorized implementation session, syntax-discover every credential retrieval/use/zeroization path, login page/control/form/submission proof, navigation listener, and token-exchange consumer.~~
- [ ] ~~1.2 Add synthetic regressions for navigation/DOM/form-action/listener replacement after preflight and between username/password/submit effects.~~
- [ ] ~~1.3 Define opaque one-shot capability, document/form/source/proxy identity, expiry/revocation, stage, and categorical no-echo error schemas.~~

## 2. Implement guarded single-use submission

- [ ] ~~2.1 Make preflight issue an unforgeable capability bound to exact DEV origins/routes, context/page/main-frame/document, controls/form, source evidence, expected exchange, and proxy instance.~~
- [ ] ~~2.2 Revalidate immediately before every secret-bearing effect and revoke on navigation, replacement, popup/frame transfer, source/proxy drift, timeout, or duplicate use.~~
- [ ] ~~2.3 Move credential retrieval and fill/submit behind the capability owner; remove generic exported helper authority and prevent secrets entering page callbacks/evidence/errors.~~

## 3. Failure and retry integrity

- [ ] ~~3.1 On partial fill or failure, zeroize credential material, revoke capability, close/replace the affected page/context, and emit only categorical stage data.~~
- [ ] ~~3.2 Require full fresh preflight and retrieval for retry; forbid reuse of locators, document identity, or plaintext material.~~
- [ ] ~~3.3 Preserve exact token-exchange/auth-shell/MFA checks and bind their result to the same credential-use generation.~~

## 4. Adversarial and mutation proof

- [ ] ~~4.1 Test same/different allowed origin navigation, history changes, detached/replaced/duplicate controls, iframe/popup movement, changed form action/target/method, and dynamic listener replacement.~~
- [ ] ~~4.2 Test proxy/source/currentness loss, timeout, double use, partial fill, disabled/hidden controls, unexpected exchange, categorical errors, zeroization, and no evidence leakage.~~
- [ ] ~~4.3 Register mutations for omitted rechecks, generic selector-only admission, capability reuse, listener/action drift, unbound exchange, and incomplete credential consumer census.~~

## 5. Acceptance and handoff

- [ ] ~~5.1 Run focused synthetic credential/login/direct-runner/storage/proxy suites, typechecks, hardening/mutations, local/clean/topology gates, and full regression without real credentials.~~
- [ ] ~~5.2 Update auth/safety/architecture documentation, strict-validate, inspect privacy/diff, and integrate only through an owned C-00 session.~~
