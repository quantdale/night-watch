# Proposal — repository master hardening implementation

Nightwatch's established semantic, provenance, source-safety, containment and
owner-policy foundations are strong. Its newer autonomous, filesystem
persistence, release accounting and dashboard paths carry confirmed defects
and incomplete workflows. The repository needs selective repair, not a
rewrite, and the master hardening plan already specifies that repair.

This change executes the fourteen open findings NW-01 through NW-14 in the
plan's dependency order: trust and private-path defects first, then
autonomous-state durability, then resource lifecycles, then the operator
workflow, then release truth, then one certified checkpoint.

Every repair is additive or behaviour-preserving for valid inputs. Closed
vocabularies become mechanically closed; one topology-aware authority decides
private-path containment; mutable state gains generations and atomic
publication while immutable evidence keeps its no-replace identity; each
asynchronous operation gets one owner for deadline, cancellation and cleanup;
the dashboard exposes its bounded pages and only its enabled capabilities;
and a release receipt is bound to the discovered validation universe.

No P0 is claimed. The review found no evidence of arbitrary command
authority, external boundary escape, or production contact, and this change
adds none. DEV, NEXT, production, cloud, datastore, external filing and
publication remain out of scope and unauthorized. Artifacts written by
earlier schemas must keep reading, and no gate is weakened and no test
deleted to produce green output.
