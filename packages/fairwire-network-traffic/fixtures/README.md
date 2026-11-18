# Fairwire Network Traffic fixtures

Fictional flows between documentation address ranges (192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24) and private inside ranges. No real network.

- `flows.csv`: 37 flow rows with planted problems: RDP reached twice from one outside address, SMB reached from another, a published RDP gateway (10.0.5.10, allowed in `settings.json`), Telnet and HTTP across the edge, 700 MB uploaded from a file server on a Saturday night, 22 tiny flows from one laptop to 22 ports of one server, one host carrying most of the bytes, a sensor hub sending 2,000 tiny packets, ordinary HTTPS and DNS, and one row with a bad address (skipped).
- `settings.json`: allows the published gateway and sets business hours 7 to 19.
