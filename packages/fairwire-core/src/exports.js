// Catalogue of export files from real firewall, identity, cloud billing, backup,
// device management and service desk systems that the Fairwire agents recognise.
//
// Each entry says how to recognise the file (column names that must be there).
// An agent turns an entry into a profile by adding its own column map:
//
//   exportProfile('slack_members', { user: 'fullname', email: 'email' })
//
// basis:
//   'documented'  the column names were checked against the vendor's own
//                 documentation (source and date given);
//   'recalled'    the layout was written from knowledge of the export and was
//                 not checked against documentation or a live account.
// Neither kind was tested against a live account. When a header differs, the
// file still maps by each column's "also called" list, `inspect` shows what was
// matched, and fairwire-sources.json names the columns by hand.

const e = (id, system, label, signature, extra = {}) => Object.freeze({ id, system, label, signature, basis: 'recalled', ...extra });

export const EXPORTS = Object.freeze(Object.fromEntries([
  // Firewalls
  e('paloalto_security_rules', 'Palo Alto Networks PAN-OS', 'Security policy rules exported to CSV from the web interface', ['Name', 'Source Zone', 'Destination Zone', 'Service', 'Action']),
  e('fortigate_policies', 'Fortinet FortiGate', 'Firewall policy list exported to CSV', ['Policy ID', 'Source Interface', 'Destination Interface', 'Service', 'Action']),
  // Identity
  e('entra_signins', 'Microsoft Entra ID', 'Sign-in logs downloaded as CSV', ['User principal name', 'Application', 'IP address', 'Status']),
  e('okta_system_log', 'Okta', 'System Log exported as CSV', ['actor.alternateId', 'eventType', 'outcome.result']),
  e('entra_mfa_registration', 'Microsoft Entra ID', 'User registration details (authentication methods) exported as CSV', ['User principal name', 'Is MFA registered']),
  // Cloud bills
  e('aws_cur', 'Amazon Web Services', 'Cost and Usage Report, CSV', ['lineItem/UsageAccountId', 'lineItem/ProductCode', 'lineItem/UnblendedCost']),
  e('azure_cost_details', 'Microsoft Azure', 'Cost details export, CSV', ['SubscriptionName', 'MeterCategory', 'CostInBillingCurrency']),
  e('gcp_billing_report', 'Google Cloud', 'Billing report downloaded as CSV', ['Project name', 'Service description', 'SKU description']),
  // Backups, devices, networks
  e('veeam_job_sessions', 'Veeam Backup & Replication', 'Job session history exported to CSV', ['Job Name', 'Status', 'Start Time', 'End Time']),
  e('intune_devices', 'Microsoft Intune', 'All devices list exported to CSV', ['Device name', 'OS', 'OS version', 'Compliance', 'Last check-in']),
  e('defender_devices', 'Microsoft Defender for Endpoint', 'Device inventory exported to CSV', ['Device Name', 'Onboarding Status', 'Health State']),
  e('meraki_clients', 'Cisco Meraki', 'Network-wide clients list exported to CSV', ['Description', 'MAC address', 'IPv4 address', 'SSID']),
  e('windows_dhcp_leases', 'Windows Server DHCP', 'Address leases exported from the DHCP console', ['Client IP Address', 'Name', 'Lease Expiration', 'Unique ID']),
  // Service management
  e('servicenow_incidents', 'ServiceNow', 'Incident list exported to CSV', ['number', 'priority', 'opened_at', 'state', 'assignment_group']),
  e('jira_service_management', 'Jira Service Management', 'Issue search exported to CSV', ['Issue key', 'Priority', 'Created', 'Status']),
].map((x) => [x.id, x])));

/** A profile for an agent: a catalogue entry plus the agent's column map. */
export function exportProfile(key, map, extra = {}) {
  const base = EXPORTS[key];
  if (!base) throw new Error(`unknown export "${key}"`);
  return { ...base, map, ...extra };
}

export const EXPORTS_BASIS_NOTE = 'Where a layout says "checked", its column names were compared with the vendor\'s documentation on that date. The other layouts were written from knowledge of the export and were not checked. None was tested against a live account.';

/**
 * Row hook for grouped reports (QuickBooks style): a row with only its first
 * cell filled names the group for the rows under it; "Total for ..." rows end it.
 * The group name is written to `field` on each detail row.
 */
export function carryGroup(field, { groupColumn = '', isDetail } = {}) {
  return (rows) => {
    const out = []; let group = '';
    for (const r of rows) {
      const label = String(r[groupColumn] ?? '').trim();
      const detail = isDetail ? isDetail(r) : Object.entries(r).some(([k, v]) => k !== groupColumn && k !== field && String(v ?? '').trim() !== '');
      if (label && /^(grand\s+)?total\b/i.test(label)) continue;
      if (label && !detail) { group = label; continue; }
      if (!detail) continue;
      const { [groupColumn]: _drop, ...rest } = r;
      out.push({ ...rest, [field]: String(r[field] ?? '').trim() || label || group });
    }
    return out;
  };
}

/** Row hook: keep the first row for each value of `field` (Shopify repeats an order once per line item). */
export function firstRowPer(field) {
  return (rows) => { const seen = new Set(); return rows.filter((r) => { const k = String(r[field] ?? ''); if (!k || seen.has(k)) return false; seen.add(k); return true; }); };
}

/** "First Last" from two columns, for exports that split the name. */
export const fullName = (first, last) => ({ from: [first, last], compute: (_r, get) => [get(first), get(last)].map((v) => String(v ?? '').trim()).filter(Boolean).join(' ') });
