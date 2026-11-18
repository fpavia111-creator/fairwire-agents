# Boreas fixtures

Fictional firewall rules (documentation and private address ranges, made-up owners).

- `rules.csv`: 11 rules in policy order. Planted: RDP and FTP open from the internet, the FTP rule past its end date and unused since August, an any-to-any test rule with no owner and logging off, a branch web rule shadowed by the general web rule, a duplicate DNS rule, an SMB rule with no hits, and a disabled rule left in place.
- `exports/paloalto-rules.csv`: three of the rules written the way a Palo Alto rule export names its columns (written from knowledge of the export, not checked against a live firewall).
- `settings.json`: untrust is the internet zone; 90 days without a hit is unused.
