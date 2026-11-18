# Meltemi fixtures

Fictional backup history for 12 to 17 November 2026.

- `jobs.csv`: 26 runs. SQL-01 backs up every night but the last backup is a third of its usual size. FILE-01 has failed for the last three nights and its last offsite copy is from 2 November. MAIL-01 ends with warnings every night, keeps backups 14 days and has no offsite copy. WEB-01 is fine.
- `critical.csv`: four critical systems with RPOs; APP-02 is in no job.
- `settings.json`: policy retention of 30 days.
