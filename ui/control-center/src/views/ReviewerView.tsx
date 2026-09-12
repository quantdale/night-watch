import { useState, type ReactNode } from 'react';
import { REVIEW_DECISIONS, readBackReviewDecision, submitReviewDecision, type ReviewDecision } from '../api';
import type { DataLoadState, ReviewerElement, ReviewerFindingSnapshot, ReviewerSnapshot } from '../types';
import { DataErrorState, EpistemicBadge, LoadingState, MetricCard, StatusPill, formatCategory } from '../shared';

/** RS-1 reviewer view: epistemic classes rendered verbatim, never as colour. */

function ReviewerElementCell<T>({ element, render }: {
  readonly element: ReviewerElement<T>;
  readonly render: (value: T) => ReactNode;
}): ReactNode {
  return (
    <td>
      <EpistemicBadge epistemicClass={element.epistemicClass} />
      {element.value === null
        ? <small>Not determined{element.basis.length === 0 ? '' : ` · ${element.basis.map(formatCategory).join(', ')}`}</small>
        : <>{render(element.value)}{element.basis.length === 0 ? null : <small>Basis: {element.basis.map(formatCategory).join(', ')}</small>}</>}
    </td>
  );
}

/**
 * The owner-local decision control for one finding.
 *
 * Deliberately narrow. It offers the five canonical decisions and no free-form
 * state, it disappears once a decision is terminal, and it never claims the
 * decision means more than it does. Bypassing it changes nothing: the server
 * refuses a second decision on the same binding regardless of what the UI
 * shows.
 */
function ReviewDecisionCell({
  item,
  capability,
  onDecided,
}: {
  readonly item: ReviewerFindingSnapshot;
  /** NW-09. The SERVER's answer about the write route. */
  readonly capability: 'ENABLED' | 'DISABLED' | 'UNKNOWN';
  readonly onDecided: () => void;
}): ReactNode {
  const [pending, setPending] = useState(false);
  const [outcome, setOutcome] = useState<string | null>(null);
  const [rationale, setRationale] = useState('');

  const value = item.localReview.value;
  // A stored record at a superseded schema is a migration, not a defect, and
  // it is not a decision the reviewer can act on. No controls are offered
  // against bytes this build does not read.
  if (value !== null && value.bindingCurrentness === 'VERSION_UNSUPPORTED') {
    return (
      <td>
        <small>Decision unavailable: the stored record predates the current schema.</small>
        <small>Run the declared migration (or record an orphan decision) before deciding again.</small>
      </td>
    );
  }
  const decided = value !== null && value.decision !== null && value.bindingCurrentness === 'CURRENT';

  // NW-09. Gate on the capability the SERVER reports, not on the per-finding
  // review identity. The identity answers whether a review STORE exists; it
  // says nothing about whether this server serves the write route, so the UI
  // used to offer controls whose POST the server would refuse as not found.
  // Unknown fails closed: an unloaded overview is not permission.
  if (capability !== 'ENABLED') {
    return (
      <td>
        <small>{capability === 'UNKNOWN' ? 'Review capability not yet known' : 'Read-only server'}</small>
        <small>
          {capability === 'UNKNOWN'
            ? 'Waiting for the server capability report.'
            : 'Start with --enable-local-review to record owner-local decisions.'}
        </small>
      </td>
    );
  }

  // No store configured: there is nothing to decide against, and saying so is
  // better than showing controls that cannot work.
  if (item.reviewIdentity === null) {
    return (
      <td>
        <small>No owner-local review store</small>
      </td>
    );
  }

  if (decided) {
    return (
      <td>
        <strong>Decided</strong>
        <small>{formatCategory(value.decision ?? '')}</small>
        <small>{value.reviewedAt === null ? 'No timestamp recorded' : value.reviewedAt}</small>
        <small>Terminal. A second decision is refused by the server.</small>
      </td>
    );
  }

  const submit = async (decision: ReviewDecision): Promise<void> => {
    setPending(true);
    setOutcome(null);
    const identity = item.reviewIdentity as string;
    try {
      const response = await submitReviewDecision({
        findingId: item.findingId,
        reviewIdentity: identity,
        decision,
        ...(rationale.trim() === '' ? {} : { rationale: rationale.trim() }),
      });
      setOutcome(response.result);
      if (response.result === 'ACCEPTED') {
        setRationale('');
        onDecided();
      }
    } catch {
      // NW-09. The request failed without a readable answer, so whether the
      // decision was recorded is UNKNOWN. Never retry: the store refuses a
      // second decision on the same binding, so a retry would either
      // duplicate the request or return ALREADY_DECIDED without telling the
      // operator which attempt recorded it. Ask the server what it now holds
      // for this exact review identity instead.
      const readback = await readBackReviewDecision({ findingId: item.findingId, reviewIdentity: identity });
      if (readback.state === 'RECORDED') {
        setOutcome('RECORDED_CONFIRMED_BY_READBACK');
        setRationale('');
        onDecided();
      } else if (readback.state === 'NOT_RECORDED') {
        setOutcome('NOT_RECORDED_SAFE_TO_RETRY');
      } else {
        setOutcome('OUTCOME_UNKNOWN_READ_BACK_FAILED');
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <td>
      <label className="visually-hidden" htmlFor={`rationale-${item.findingId}`}>
        Rationale for {item.findingId}
      </label>
      <textarea
        id={`rationale-${item.findingId}`}
        className="review-rationale"
        value={rationale}
        maxLength={2000}
        rows={2}
        placeholder="Rationale (optional, no customer values)"
        disabled={pending}
        onChange={(event) => setRationale(event.target.value)}
      />
      <div className="review-actions">
        {REVIEW_DECISIONS.map((decision) => (
          <button
            key={decision}
            type="button"
            className="review-action"
            disabled={pending}
            onClick={() => {
              void submit(decision);
            }}
          >
            {formatCategory(decision)}
          </button>
        ))}
      </div>
      {outcome === null ? null : (
        <small
          className={
            outcome === 'ACCEPTED' || outcome === 'RECORDED_CONFIRMED_BY_READBACK'
              ? 'review-outcome-ok'
              : 'review-outcome-warn'
          }
        >
          {outcome === 'ACCEPTED'
            ? 'Recorded locally. This is not Leslie or Pondr sign-off.'
            : outcome === 'RECORDED_CONFIRMED_BY_READBACK'
              ? 'The response was lost, but a read-back confirms this decision is recorded. Not organizational sign-off.'
              : outcome === 'NOT_RECORDED_SAFE_TO_RETRY'
                ? 'The request failed and a read-back shows nothing was recorded. You can decide again.'
                : outcome === 'OUTCOME_UNKNOWN_READ_BACK_FAILED'
                  ? 'The request failed and the read-back could not reach the server. Whether it was recorded is unknown; refresh before deciding again.'
                  : `Refused: ${formatCategory(outcome)}`}
        </small>
      )}
      <small>Owner-local only. Never organizational sign-off.</small>
    </td>
  );
}

export function ReviewerView({ state, capability, onRetry }: { readonly state: DataLoadState<ReviewerSnapshot>; readonly capability: 'ENABLED' | 'DISABLED' | 'UNKNOWN'; readonly onRetry: () => void }): ReactNode {
  if (state.kind === 'loading' || state.kind === 'idle') return <LoadingState />;
  if (state.kind === 'error') return <DataErrorState title="Reviewer intelligence unavailable" onRetry={onRetry} />;
  const items = state.data.items;
  const factCount = items.filter((item) => item.confidence.epistemicClass === 'FACT').length;
  const duplicateCount = items.filter((item) => item.probableDuplicates.length > 0).length;
  const unknownCount = items.filter((item) => item.relationship.epistemicClass === 'UNKNOWN').length;
  return (
    <div className="view-stack">
      <section className="page-intro">
        <div>
          <p className="eyebrow">REVIEW / INTELLIGENCE</p>
          <h1>Separate what was proved from what is suggested.</h1>
          <p>Every value below is labelled FACT, RECOMMENDATION, or UNKNOWN by the service that produced it. A duplicate suggestion is never a verdict, and a local review decision is never Alphaus organizational sign-off.</p>
        </div>
        <StatusPill value={state.data.state} />
      </section>
      <section className="metric-grid">
        <MetricCard label="Findings reviewed" value={String(items.length)} detail={state.data.state === 'AVAILABLE' ? 'Projected from the finding cones' : 'No reviewer claim'} />
        <MetricCard label="Confidence established" value={String(factCount)} detail={`${items.length - factCount} not determined`} tone={factCount > 0 ? 'ready' : 'warning'} />
        <MetricCard label="Duplicate suggestions" value={String(duplicateCount)} detail="Advisory only" tone={duplicateCount > 0 ? 'warning' : 'neutral'} />
        <MetricCard label="Relationship unknown" value={String(unknownCount)} detail="Missing comparison inputs" tone={unknownCount > 0 ? 'warning' : 'ready'} />
      </section>
      <article className="panel">
        <div className="panel-heading">
          <div><p className="eyebrow">REVIEWER INDEX</p><h2>Finding intelligence</h2></div>
          <span className="table-limit">Limit {state.data.page.limit}</span>
        </div>
        {items.length === 0
          ? <div className="mini-state mini-state-warning">{state.data.state === 'UNAVAILABLE' ? 'Owner-local findings are unavailable, so no reviewer intelligence is projected. This is not a claim that no defects exist.' : 'No findings to review. Empty is not proof of no defects.'}</div>
          : <div className="table-scroll"><table>
              <thead><tr>
                <th scope="col">Finding</th>
                <th scope="col">Relationship</th>
                <th scope="col">Probable duplicates</th>
                <th scope="col">Recurrence</th>
                <th scope="col">Defect class</th>
                <th scope="col">Expectation provenance</th>
                <th scope="col">Confidence</th>
                <th scope="col">Local review</th>
                <th scope="col">Decision</th>
              </tr></thead>
              <tbody>{items.map((item) => (
                <tr key={item.findingId}>
                  <td>
                    <strong>{item.findingId}</strong>
                    {item.unknowns.length === 0 ? null : <small>Unknown: {item.unknowns.map(formatCategory).join(', ')}</small>}
                  </td>
                  <ReviewerElementCell element={item.relationship} render={(value) => <>
                    <strong>{formatCategory(value.relationship)}</strong>
                    <small>{formatCategory(value.confidence)}</small>
                    <small>{value.possibleOriginalId === null ? 'No earlier finding pointed to' : `Possibly original: ${value.possibleOriginalId}`}</small>
                    {/* Evidence AGAINST the proposed relationship. Dropping it
                        left a suggestion looking better supported than it is. */}
                    <small className={value.counterevidence.length === 0 ? undefined : 'row-note-warning'}>{value.counterevidence.length === 0 ? 'No counterevidence recorded' : `Counterevidence: ${value.counterevidence.map(formatCategory).join(', ')}`}</small>
                    <small>Final verdict: {value.finalVerdictAuthority === 'HUMAN_ORGANIZATIONAL' ? 'human organizational' : formatCategory(value.finalVerdictAuthority)}</small>
                  </>} />
                  <td>
                    {item.probableDuplicates.length === 0
                      ? <small>None suggested</small>
                      : <>
                          <EpistemicBadge epistemicClass="RECOMMENDATION" />
                          {item.probableDuplicates.map((duplicate) => (
                            <small key={duplicate.findingId}>{duplicate.findingId} · {formatCategory(duplicate.relationship)} · {formatCategory(duplicate.confidence)}{duplicate.basis.length === 0 ? ' · no basis stated' : ` · basis ${duplicate.basis.map(formatCategory).join(', ')}`}{duplicate.finalVerdictAuthority === 'HUMAN_ORGANIZATIONAL' ? ' · verdict human organizational' : ` · verdict ${formatCategory(duplicate.finalVerdictAuthority)}`}</small>
                          ))}
                          <small>Advisory. Not a duplicate verdict.</small>
                        </>}
                  </td>
                  <ReviewerElementCell element={item.recurrence} render={(value) => <>
                    <strong>{formatCategory(value.recurrence)}</strong>
                    <small>{value.priorFindingId === null ? 'No prior finding matched' : `Prior: ${value.priorFindingId}`}</small>
                  </>} />
                  <ReviewerElementCell element={item.defectClass} render={(value) => <>
                    <strong>{value.classId}</strong>
                    <small>Shared invariant: {formatCategory(value.sharedInvariant)}</small>
                    <small>{value.memberFindingIds.length} member(s) · {formatCategory(value.confidence)}</small><small>Members: {value.memberFindingIds.join(', ')}</small>
                    <small>{value.counterexampleCount} counterexample(s) · {value.unknownCount} unknown(s)</small>
                  </>} />
                  <ReviewerElementCell element={item.expectationProvenance} render={(value) => <strong>{formatCategory(value)}</strong>} />
                  <ReviewerElementCell element={item.confidence} render={(value) => <strong>{formatCategory(value)}</strong>} />
                  <ReviewerElementCell element={item.localReview} render={(value) => value.bindingCurrentness === 'VERSION_UNSUPPORTED' ? <>
                    {/* The owner response differs: a corrupt record is a defect
                        to report, an unsupported one is a migration to run. */}
                    <strong>Stored review predates the current schema</strong>
                    <small>
                      {value.foundVersions.length === 0 ? 'Version not recorded' : value.foundVersions.map(formatCategory).join(', ')}
                      {value.affectedRecordCount > 0 ? ` · ${value.affectedRecordCount} affected record(s)` : ''}
                    </small>
                    <small className="row-note-warning">
                      {value.migration === null
                        ? 'This is a migration, not a defect. No disposition is declared for this version yet; an owner decision is required.'
                        : `This is a migration, not a defect. Declared disposition: ${formatCategory(value.migration)}.`}
                    </small>
                    {value.currentSchema === null ? null : <small>Current schema: {value.currentSchema}</small>}
                  </> : <>
                    <strong>{formatCategory(value.state)}</strong>
                    <small>{value.decision === null ? 'No decision recorded' : formatCategory(value.decision)}</small>
                    <small>Binding {formatCategory(value.bindingCurrentness)} · {value.transitionCount} transition(s)</small>
                    {value.notEquivalentTo.length === 0 ? null : <small className="row-note-warning">Not equivalent to: {value.notEquivalentTo.map(formatCategory).join(', ')}</small>}
                    <small>Authority: {formatCategory(value.organizationalAuthority)}. This is local review only, never Leslie or Pondr sign-off.</small>
                  </>} />
                  <ReviewDecisionCell item={item} capability={capability} onDecided={onRetry} />
                </tr>
              ))}</tbody>
            </table></div>}
      </article>
      <article className="panel">
        <div className="panel-heading"><div><p className="eyebrow">SUGGESTED ALPHAUS CLASSIFICATION</p><h2>Recommendations, not decisions</h2></div><StatusPill value="WARNING" label="Human decides" /></div>
        <p className="panel-intro">Nightwatch proposes a classification and states the basis for each part. It files nothing, and a team is left UNKNOWN unless attribution carries evidence.</p>
        {items.length === 0 ? <div className="mini-state">No recommendations to show.</div> : <div className="table-scroll"><table>
          <thead><tr><th scope="col">Finding</th><th scope="col">Severity</th><th scope="col">Catch stage</th><th scope="col">Source</th><th scope="col">Team</th></tr></thead>
          <tbody>{items.map((item) => (
            <tr key={item.findingId}>
              <td><strong>{item.findingId}</strong></td>
              <ReviewerElementCell element={item.alphausRecommendation.severity} render={(value) => <strong>{formatCategory(value)}</strong>} />
              <ReviewerElementCell element={item.alphausRecommendation.catchStage} render={(value) => <strong>{formatCategory(value)}</strong>} />
              <ReviewerElementCell element={item.alphausRecommendation.source} render={(value) => <strong>{formatCategory(value)}</strong>} />
              <ReviewerElementCell element={item.alphausRecommendation.team} render={(value) => <strong>{value}</strong>} />
            </tr>
          ))}</tbody>
        </table></div>}
      </article>
      <div className="callout callout-warning">
        <strong>Authority boundary</strong>
        <span>Final verdict authority is {formatCategory(state.data.finalVerdictAuthority)}. Local review carries {formatCategory(state.data.organizationalAuthority)} and is never equivalent to a Leslie genuine/invalid verdict or a Pondr approval. This view files nothing and decides nothing.</span>
      </div>
    </div>
  );
}

