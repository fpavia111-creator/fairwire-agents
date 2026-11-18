// Fairwire Email Gateway: email security gateway report review. Pure functions.
import { num, str, low, yes, minutesBetween, pct, finding } from 'fairwire-core';

export const CHECKS = Object.freeze({
  released_threat: 'A message the gateway judged phishing or malware that someone released from quarantine.',
  allowlist_sent_threat: 'A sender on an allow list that sent phishing, malware or spam (allow lists skip checks).',
  outbound_spam: 'An internal mailbox sending many messages the gateway judged spam or phishing (a sign the account is compromised).',
  late_clawback: 'Phishing that reached inboxes and was pulled back later than your limit.',
  most_targeted: 'A person who received many phishing or malware messages (worth extra training or protection).',
  dlp_hits: 'An internal sender who triggered data-loss rules several times.',
});

export const MESSAGE_FIELDS = Object.freeze({
  message_id: { aliases: ['Message ID', 'Message-ID', 'ID', 'Network Message ID'], required: true },
  received_at: { type: 'datetime', aliases: ['Received', 'Date', 'Timestamp', 'Received Time', 'Delivery Time'] },
  direction: { aliases: ['Direction', 'Mail Direction', 'Flow'] },
  sender: { aliases: ['Sender', 'From', 'Sender Address', 'P1 Sender'], pii: 'user' },
  recipient: { aliases: ['Recipient', 'To', 'Recipients', 'Recipient Address'], pii: 'user' },
  verdict: { aliases: ['Verdict', 'Threat', 'Classification', 'Detection', 'Threat Type'] },
  action: { aliases: ['Action', 'Delivery Action', 'Disposition', 'Status'] },
  allowlisted: { aliases: ['Allowlisted', 'Allow Listed', 'Safe Sender', 'Bypass', 'Override'] },
  clawed_back_at: { type: 'datetime', aliases: ['Clawed Back', 'Removed At', 'ZAP Time', 'Remediated At', 'Pulled Back'] },
  dlp_rule: { aliases: ['DLP Rule', 'Policy Match', 'DLP Policy', 'Content Rule'] },
});

export const SETTINGS_SCHEMA = { type: 'object', additionalProperties: false, properties: {
  outbound_spam_min: { type: 'integer', minimum: 1, description: 'Outbound spam or phishing from one mailbox before it is flagged (default 20)' },
  clawback_minutes: { type: 'number', minimum: 1, description: 'Minutes after delivery by which phishing should be pulled back (default 60)' },
  targeted_min: { type: 'integer', minimum: 1, description: 'Phishing or malware messages to one person before they count as most targeted (default 5)' },
  dlp_min: { type: 'integer', minimum: 1, description: 'Data-loss rule hits from one sender before they are flagged (default 3)' },
} };
export const DEFAULTS = Object.freeze({ outbound_spam_min: 20, clawback_minutes: 60, targeted_min: 5, dlp_min: 3 });

const THREAT = /phish|malware|virus|impersonation|bec|credential/i;
const SPAMMY = /phish|malware|virus|spam|impersonation/i;

export function reviewMail(rows, settings = {}) {
  const s = { ...DEFAULTS, ...settings };
  const ms = rows.filter((r) => str(r.message_id)).map((r) => ({ id: str(r.message_id), at: str(r.received_at), dir: /out/i.test(str(r.direction)) ? 'outbound' : /intern/i.test(str(r.direction)) ? 'internal' : 'inbound', sender: low(r.sender), recipient: low(r.recipient), verdict: str(r.verdict), action: low(r.action), allow: yes(r.allowlisted) === true, claw: str(r.clawed_back_at), dlp: str(r.dlp_rule) }));
  const items = []; const group = (pred, key) => { const m = new Map(); for (const x of ms) if (pred(x)) m.set(key(x), [...(m.get(key(x)) || []), x]); return m; };
  for (const x of ms) if (THREAT.test(x.verdict) && /releas/.test(x.action)) items.push(finding('released_threat', 'high', x.id, `Message ${x.id} to ${x.recipient} was judged ${x.verdict} and released from quarantine.`, 'Pull the message back, check whether links were clicked or attachments opened, and review who may release threats.', { subject: x.recipient }));
  for (const [sender, list] of group((x) => x.allow && SPAMMY.test(x.verdict), (x) => x.sender)) items.push(finding('allowlist_sent_threat', 'high', sender, `${sender} is allow-listed and sent ${list.length} message(s) judged ${[...new Set(list.map((x) => low(x.verdict)))].sort().join(', ')}.`, 'Remove the allow-list entry; allow lists should name a specific use, not skip all checks.', { subject: sender, messages: list.length }));
  for (const [sender, list] of group((x) => x.dir === 'outbound' && SPAMMY.test(x.verdict), (x) => x.sender)) if (list.length >= s.outbound_spam_min) items.push(finding('outbound_spam', 'high', sender, `${sender} sent ${list.length} outbound messages judged spam or phishing.`, 'Treat the mailbox as compromised: reset the password, revoke sessions and check its inbox rules.', { subject: sender, messages: list.length }));
  for (const x of ms) if (THREAT.test(x.verdict) && x.claw && x.at) { const mins = minutesBetween(x.at, x.claw); if (mins !== null && mins > s.clawback_minutes) items.push(finding('late_clawback', 'medium', x.id, `Message ${x.id} (${x.verdict}) sat in ${x.recipient}'s inbox for ${mins} minutes before it was pulled back.`, 'Check whether the person clicked; look at why the pull-back was slow.', { subject: x.recipient })); }
  for (const [rcpt, list] of group((x) => x.dir === 'inbound' && THREAT.test(x.verdict), (x) => x.recipient)) if (list.length >= s.targeted_min) items.push(finding('most_targeted', 'low', rcpt, `${rcpt} received ${list.length} phishing or malware message(s).`, 'Offer this person targeted training and phishing-resistant MFA.', { subject: rcpt, messages: list.length }));
  for (const [sender, list] of group((x) => x.dir !== 'inbound' && !!x.dlp, (x) => x.sender)) if (list.length >= s.dlp_min) items.push(finding('dlp_hits', 'low', sender, `${sender} triggered data-loss rules ${list.length} times (${[...new Set(list.map((x) => x.dlp))].sort().join(', ')}).`, 'Talk to the person or their manager; it is often a process that needs a safer way to share.', { subject: sender, messages: list.length }));
  const inbound = ms.filter((x) => x.dir === 'inbound');
  return { messages: ms.length, inbound: inbound.length, outbound: ms.filter((x) => x.dir === 'outbound').length, threats: ms.filter((x) => THREAT.test(x.verdict)).length, quarantined_pct: pct(inbound.filter((x) => /quarant|block|reject/.test(x.action)).length, inbound.length), items };
}
