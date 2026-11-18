# Fairwire Endpoint Protection fixtures

Fictional endpoint security export, asset list and alerts.

- `devices.csv`: 8 devices. PC-103 has protection off; PC-104 tamper protection off; PC-105 runs in passive mode; PC-106 stopped reporting on 3 November with old signatures and an old agent; PC-107 runs two products; SRV-201 is passive on purpose (listed in settings).
- `assets.csv`: 11 assets; PC-108 and SRV-202 have no agent; the printer is skipped.
- `alerts.csv`: a high alert open since 12 November, a medium alert, a resolved high alert and a critical alert opened last night (inside the two days).
- `settings.json`: SRV-201 may be passive; agent 4.18.24000 or newer.
