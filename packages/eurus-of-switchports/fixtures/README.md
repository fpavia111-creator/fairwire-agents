# Eurus fixtures

Fictional switch ports on two switches.

- `ports.csv`: 12 ports. A trunk with no description carrying every VLAN, a server port with 1,450 CRC errors, a desk port in VLAN 1, a desk port at half duplex, an enabled desk port unused since July, a lab port in VLAN 99 (not in the plan) and a spare port that is shut down (not flagged).
- `vlans.csv`: six VLANs; voice-old (40) is not used by any port.
- `settings.json`: access ports may use VLANs 10, 20 and 30.
