# Ossa fixtures

Fictional log sources for one SIEM, read as of 18 November 2026.

- `sources.csv`: 7 sources. Firewall traffic (a security log) is kept 90 days against 365; dc-02 has been silent since 14 November; the web app jumped from 6 to 38 GB a day; the proxy (network) is kept 30 days against 90; the payroll audit log is kept five years against 30 days.
- `assets.csv`: 10 assets; file-01 and the core switch send no logs; the laptop is out of scope.
- `settings.json`: the default limits written out.
