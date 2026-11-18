# Skiron fixtures

Fictional patch state for 12 devices and four made-up update ids.

- `patches.csv`: 48 rows (12 devices x 4 updates). Six office PCs are fully patched. PC-107 misses the October critical update; PC-108 misses an important and a moderate update past policy; PC-109 failed the October critical update three times; PC-110 runs Windows 10; SRV-201 waits for a restart; SRV-202 stopped reporting on 20 October. The November critical update is missing on four devices but is still inside the 14 days.
- `settings.json`: days to patch for critical and important updates; seven days without a scan is silent.
