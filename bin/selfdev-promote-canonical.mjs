#!/usr/bin/env node
/**
 * Phase 8B.1 owner-gated canonical promotion CLI.
 *
 * Six exact-ID subcommands only: `inspect`, `prepare`, `approve`, `apply`,
 * `verify`, `status`. There is no latest/list/enumeration mode, no
 * candidate-supplied source/patch/path/command input, and no chained
 * prepare->approve->apply automation — each step is an explicit, separate
 * invocation. `approve` requires the fixed confirmation token
 * `CANONICAL_ONE_FILE_ONLY`. `apply` performs at most one canonical source
 * write, confined to the single fixed target
 * `src/core/selfDev/adoptedCaseCatalog.generated.ts`, and never touches Git.
 * `verify` must be run as its own fresh process after `apply` exits.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadTypeScriptModule as loadRuntimeTypeScriptModule } from './lib/typescript-runtime-loader.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadTypeScriptModule(file) {
  return loadRuntimeTypeScriptModule(file, { root });
}

function usage() {
  console.log('Usage:');
  console.log('  npm run selfdev:promote-canonical -- inspect --artifact-id <id> --candidate-id <id> --plan-id <id> --sandbox-result-id <id>');
  console.log('  npm run selfdev:promote-canonical -- prepare --artifact-id <id> --candidate-id <id> --plan-id <id> --sandbox-result-id <id>');
  console.log('  npm run selfdev:promote-canonical -- approve --promotion-id <id> --confirm CANONICAL_ONE_FILE_ONLY');
  console.log('  npm run selfdev:promote-canonical -- apply --promotion-id <id> --approval-id <id>');
  console.log('  npm run selfdev:promote-canonical -- verify --promotion-id <id> --receipt-id <id>');
  console.log('  npm run selfdev:promote-canonical -- status --promotion-id <id> --verification-id <id>');
  console.log('Prepares, owner-approves, and applies exactly one canonical adopted-case promotion. Never commits or pushes.');
}

const ARTIFACT_ID_RE = /^session:sha256:[0-9a-f]{64}$/;
const CANDIDATE_ID_RE = /^candidate:[0-9a-f]{64}$/;
const PLAN_ID_RE = /^adoption-plan:sha256:[0-9a-f]{64}$/;
const RESULT_ID_RE = /^adoption-sandbox-result:sha256:[0-9a-f]{64}$/;
const PROMOTION_ID_RE = /^canonical-promotion:sha256:[0-9a-f]{64}$/;
const APPROVAL_ID_RE = /^canonical-promotion-approval:sha256:[0-9a-f]{64}$/;
const RECEIPT_ID_RE = /^canonical-apply-receipt:sha256:[0-9a-f]{64}$/;
const VERIFICATION_ID_RE = /^canonical-promotion-verification:sha256:[0-9a-f]{64}$/;

function flagPairs(rest, names) {
  if (rest.length !== names.length * 2) throw new Error('SELFDEV_PROMOTE_CANONICAL_USAGE_INVALID');
  const values = {};
  for (let index = 0; index < names.length; index += 1) {
    const flag = rest[index * 2];
    const value = rest[index * 2 + 1];
    if (flag !== `--${names[index]}` || value === undefined || value.startsWith('--')) {
      throw new Error('SELFDEV_PROMOTE_CANONICAL_USAGE_INVALID');
    }
    values[names[index]] = value;
  }
  return values;
}

function parseArgs(args) {
  if (args.length === 1 && (args[0] === '--help' || args[0] === '-h')) return { help: true };
  if (args.length === 0) throw new Error('SELFDEV_PROMOTE_CANONICAL_USAGE_INVALID');
  const [command, ...rest] = args;

  if (command === 'inspect' || command === 'prepare') {
    const values = flagPairs(rest, ['artifact-id', 'candidate-id', 'plan-id', 'sandbox-result-id']);
    if (!ARTIFACT_ID_RE.test(values['artifact-id'])) throw new Error('SELFDEV_ARTIFACT_ID_INVALID');
    if (!CANDIDATE_ID_RE.test(values['candidate-id'])) throw new Error('SELFDEV_CANDIDATE_ID_INVALID');
    if (!PLAN_ID_RE.test(values['plan-id'])) throw new Error('SELFDEV_PLAN_ID_INVALID');
    if (!RESULT_ID_RE.test(values['sandbox-result-id'])) throw new Error('SELFDEV_SANDBOX_RESULT_ID_INVALID');
    return {
      help: false, command,
      artifactId: values['artifact-id'], candidateId: values['candidate-id'],
      planId: values['plan-id'], sandboxResultId: values['sandbox-result-id'],
    };
  }
  if (command === 'approve') {
    const values = flagPairs(rest, ['promotion-id', 'confirm']);
    if (!PROMOTION_ID_RE.test(values['promotion-id'])) throw new Error('SELFDEV_PROMOTION_ID_INVALID');
    return { help: false, command, promotionId: values['promotion-id'], confirm: values.confirm };
  }
  if (command === 'apply') {
    const values = flagPairs(rest, ['promotion-id', 'approval-id']);
    if (!PROMOTION_ID_RE.test(values['promotion-id'])) throw new Error('SELFDEV_PROMOTION_ID_INVALID');
    if (!APPROVAL_ID_RE.test(values['approval-id'])) throw new Error('SELFDEV_APPROVAL_ID_INVALID');
    return { help: false, command, promotionId: values['promotion-id'], approvalId: values['approval-id'] };
  }
  if (command === 'verify') {
    const values = flagPairs(rest, ['promotion-id', 'receipt-id']);
    if (!PROMOTION_ID_RE.test(values['promotion-id'])) throw new Error('SELFDEV_PROMOTION_ID_INVALID');
    if (!RECEIPT_ID_RE.test(values['receipt-id'])) throw new Error('SELFDEV_RECEIPT_ID_INVALID');
    return { help: false, command, promotionId: values['promotion-id'], receiptId: values['receipt-id'] };
  }
  if (command === 'status') {
    const values = flagPairs(rest, ['promotion-id', 'verification-id']);
    if (!PROMOTION_ID_RE.test(values['promotion-id'])) throw new Error('SELFDEV_PROMOTION_ID_INVALID');
    if (!VERIFICATION_ID_RE.test(values['verification-id'])) throw new Error('SELFDEV_VERIFICATION_ID_INVALID');
    return { help: false, command, promotionId: values['promotion-id'], verificationId: values['verification-id'] };
  }
  throw new Error('SELFDEV_PROMOTE_CANONICAL_USAGE_INVALID');
}

function safeDraftSummary(promotionModule, draft) {
  return {
    computedPromotionId: promotionModule.promotionIdFor(draft),
    candidateId: draft.candidateId,
    adoptionPlanId: draft.adoptionPlanId,
    sandboxResultId: draft.sandboxResultId,
    strategyClass: draft.strategyClass,
    preparedAgainstHeadSha: draft.preparedAgainstHeadSha,
    targetPath: draft.targetPath,
    targetPreimageDigest: draft.targetPreimageDigest,
    targetPostimageDigest: draft.targetPostimageDigest,
    expectedPostSourceBundleDigest: draft.expectedPostSourceBundleDigest,
    expectedPostContractDigest: draft.expectedPostContractDigest,
    ownerApprovalRequired: draft.ownerApprovalRequired,
    canonicalAuthority: draft.canonicalAuthority,
    maximumCanonicalSourceWrites: draft.maximumCanonicalSourceWrites,
    runtimeGitWrites: draft.runtimeGitWrites,
    externalCalls: draft.externalCalls,
    publication: draft.publication,
  };
}

function main() {
  let parsed;
  try {
    parsed = parseArgs(process.argv.slice(2));
    if (parsed.help) {
      usage();
      return;
    }

    const promotionModule = loadTypeScriptModule(path.join(root, 'src', 'core', 'selfDevPromotion', 'index.ts'));

    if (parsed.command === 'inspect') {
      const draft = promotionModule.computeCanonicalPromotionIntentDraft({
        artifactId: parsed.artifactId, candidateId: parsed.candidateId,
        adoptionPlanId: parsed.planId, sandboxResultId: parsed.sandboxResultId,
        repositoryRoot: root, nodeModulesAnchorPath: path.join(root, 'package.json'),
      });
      console.log(JSON.stringify(safeDraftSummary(promotionModule, draft)));
      return;
    }

    if (parsed.command === 'prepare') {
      const promotion = promotionModule.preparePromotion({
        artifactId: parsed.artifactId, candidateId: parsed.candidateId,
        adoptionPlanId: parsed.planId, sandboxResultId: parsed.sandboxResultId,
        repositoryRoot: root, nodeModulesAnchorPath: path.join(root, 'package.json'),
      });
      console.log(JSON.stringify({ promotionId: promotion.promotionId, ...safeDraftSummary(promotionModule, promotion) }));
      return;
    }

    if (parsed.command === 'approve') {
      const approval = promotionModule.approvePromotion({
        promotionId: parsed.promotionId, confirm: parsed.confirm, repositoryRoot: root,
      });
      console.log(JSON.stringify({
        approvalId: approval.approvalId,
        promotionId: approval.promotionId,
        approvalClass: approval.approvalClass,
        maximumApplications: approval.maximumApplications,
        canonicalSourceWriteAuthority: approval.canonicalSourceWriteAuthority,
        runtimeGitWrites: approval.runtimeGitWrites,
        publication: approval.publication,
      }));
      return;
    }

    if (parsed.command === 'apply') {
      const receipt = promotionModule.applyPromotion({
        promotionId: parsed.promotionId, approvalId: parsed.approvalId, repositoryRoot: root,
        nodeModulesAnchorPath: path.join(root, 'package.json'),
      });
      console.log(JSON.stringify(receipt));
      if (receipt.applyOutcome !== 'APPLIED') process.exitCode = 1;
      return;
    }

    if (parsed.command === 'verify') {
      const verification = promotionModule.verifyCanonicalPromotion({
        promotionId: parsed.promotionId, receiptId: parsed.receiptId, repositoryRoot: root,
        nodeModulesAnchorPath: path.join(root, 'package.json'),
      });
      console.log(JSON.stringify(verification));
      if (verification.verificationStatus !== 'CANONICAL_APPLIED_VERIFIED_UNCOMMITTED') process.exitCode = 1;
      return;
    }

    // status
    const promotionStore = new promotionModule.SelfDevCanonicalPromotionIntentStore({ readOnly: true });
    const verificationStore = new promotionModule.SelfDevCanonicalPromotionVerificationStore({ readOnly: true });
    promotionStore.readPromotion(parsed.promotionId);
    const verification = verificationStore.readVerification(parsed.verificationId);
    if (verification.promotionId !== parsed.promotionId) throw new Error('SELFDEV_PROMOTION_ID_MISMATCH');

    const provenanceService = loadTypeScriptModule(path.join(root, 'src', 'core', 'provenance', 'localGit.ts'));
    let currentness = 'CANONICAL_PROMOTION_UNCOMMITTED';
    try {
      const current = provenanceService.currentCheckoutState({ repositoryRoot: root });
      currentness = promotionModule.assessCanonicalPromotionCurrentness({ verification, current });
    } catch {
      // Authoritative source is not currently clean (pre-commit dirty state,
      // or an unrelated dirty condition) — the derived currentness stays
      // UNCOMMITTED rather than throwing; this command never mutates state.
    }
    console.log(JSON.stringify({
      promotionId: parsed.promotionId,
      verificationId: parsed.verificationId,
      verificationStatus: verification.verificationStatus,
      currentness,
      runtimeGitCommit: verification.runtimeGitCommit,
      publication: verification.publication,
    }));
  } catch (error) {
    const code = error instanceof Error ? error.message.split(':')[0] : 'SELFDEV_PROMOTE_CANONICAL_FAILED';
    console.error(code);
    process.exitCode = 1;
  }
}

main();
