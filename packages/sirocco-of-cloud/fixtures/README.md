# Sirocco fixtures

Fictional cloud costs for September and October 2026 in two made-up accounts.

- `costs.csv`: 15 monthly lines. In October a test instance runs all month in ap-southeast-2 with no owner tag, data transfer out goes from 100 to 450, a marketplace firewall subscription appears, and a dev instance runs every hour; a promotional credit is left out of the totals.
- `commitments.csv`: a savings plan ending on 31 December and a reservation ending next June.
- `settings.json`: us-east-1 and eu-west-1 are the regions in use.
- `exports/aws-cur.csv`: three lines in AWS Cost and Usage Report column names (written from knowledge of the export, not checked against a live account), with one in a region outside the list.
