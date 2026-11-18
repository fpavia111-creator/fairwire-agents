# Kaikias fixtures

Fictional DHCP leases (private addresses, made-up MAC addresses).

- `leases.csv`: 98 leases. The users scope has 88 active leases in a 100-address range, 30 of them to private (random) MAC addresses; 10.10.1.150 is also leased to a visitor laptop; a badge reader is reserved at 10.10.1.120 inside the dynamic range, where a phone also got a lease; one device also holds a lease in the printer scope; a home router (192.168.0.1) handed out two leases; four leases expired on 1 November.
- `scopes.csv`: two scopes with their dynamic ranges.
- `assets.csv`: the asset list; five user devices are missing from it.
- `settings.json`: 10.0.0.10 is the only DHCP server.
