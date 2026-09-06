# Proposal — autonomous bug-hunting programme

Nightwatch already has a strong deterministic kernel: fail-closed safety,
campaign orchestration, source intelligence, dossiers, and local review.
It does not yet have a provider-neutral long-running reasoner loop that
investigates through typed intents.

This change freezes a shared agent protocol and then implements the
autonomous stack above existing authority: AgentRuntime, CLI reasoner
transport, tool protocol, Bug Atlas, System Atlas overlay, historical
replay benchmark, and human-review dossiers.

The reasoner never receives unrestricted shell, Git, Playwright, network,
or credentials. Unknown tools, unsafe intents, unauthorized environments,
malformed or oversize output, prompt injection, and budget exhaustion fail
closed. External filing remains prohibited.
