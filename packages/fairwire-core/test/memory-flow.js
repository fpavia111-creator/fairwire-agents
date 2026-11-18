// Shared steps for agent memory tests: learn a fact, accept it as a named person.
export async function learnAndAccept(rt, prefix, kind, value, by = 'Dana Reviewer') {
  const l = await rt.call(`${prefix}_learn`, { kind, value, note: 'test' });
  if (l.status !== 'executed') throw new Error(`learn: ${JSON.stringify(l).slice(0, 300)}`);
  const args = { id: l.result.fact.id, decision: 'accept' };
  const p = await rt.call(`${prefix}_accept_learning`, args);
  if (p.status !== 'needs_approval') throw new Error(`accept did not ask: ${p.status}`);
  rt.approvals.approve(p.approval_id, by);
  const d = await rt.call(`${prefix}_accept_learning`, args);
  if (d.status !== 'executed') throw new Error(`accept: ${JSON.stringify(d).slice(0, 300)}`);
  return l.result.fact.id;
}
