# Agentes Fairwire de TI y redes

*Traducido por Claude; pendiente de revisión por un hablante nativo. El [README](README.md) en inglés es la versión de referencia.*

Treinta y un pequeños agentes MCP para equipos de TI. Cada uno tiene **una sola tarea**, como revisar reglas del cortafuegos, comprobar copias de seguridad, leer registros de inicio de sesión o revisar la factura de la nube, y no puede actuar fuera de ella. Leen los archivos que su equipo ya exporta de cortafuegos, controladores, proveedores de identidad, gestión de dispositivos, herramientas de copia, mesa de ayuda y consolas de la nube, escriben informes en su equipo y redactan notas. Todo cambio en un dispositivo, cortafuegos, zona DNS, directorio o cuenta en la nube sigue siendo **el clic de una persona con nombre**.

Parte de [Mythos Machines](https://fair-agents.com) (Fairwire en el sitio). El software es gratuito (MIT); usted paga un precio fijo por la puesta en marcha con sus archivos.

Licencia MIT · Node 20 o posterior · solo archivos locales · sin credenciales · sin dependencias · nombres y direcciones enmascarados para el modelo

## Pruébelo

```bash
npx -y boreas-of-firewalls demo     # revisión de reglas del cortafuegos con datos ficticios
npx -y angelia-of-signins demo      # revisión de inicios de sesión con datos ficticios
```

## Los agentes

**Red y perímetro:** `boreas-of-firewalls` (reglas del cortafuegos), `iris-of-traffic` (NetFlow, IPFIX, sFlow), `zephyrus-of-vpn` (registros de VPN), `notus-of-dns` (consultas DNS), `etesian-of-zones` (higiene de zonas DNS), `aura-of-wifi` (controladores Wi-Fi), `eurus-of-switchports` (puertos de switch y VLAN), `kaikias-of-leases` (DHCP), `echo-of-voip` (calidad de llamadas).

**Identidad, correo y administradores:** `angelia-of-signins` (inicios de sesión), `bora-of-mfa` (cobertura de MFA), `arke-of-admins` (roles con privilegios), `tramontane-of-directory` (higiene del directorio), `pheme-of-gateways` (pasarela de correo).

**Dispositivos y software:** `argestes-of-assets` (conciliación con la CMDB), `skiron-of-patches` (estado de parches), `apeliotes-of-endpoints` (protección de endpoints), `eurybates-of-mobiles` (dispositivos móviles), `levante-of-software` (instalaciones frente a licencias), `ostro-of-printers` (parque de impresoras).

**Operación y resiliencia:** `meltemi-of-backups` (copias de seguridad), `aparctias-of-restores` (pruebas de restauración), `stentor-of-incidents` (disponibilidad e incidentes), `ceryx-of-changes` (calendario de cambios), `talthybius-of-tickets` (SLA de tickets), `ossa-of-logs` (retención de registros).

**Gasto de TI y uso de IA:** `sirocco-of-cloud` (facturas de la nube), `chinook-of-renewals` (contratos y preavisos), `libeccio-of-telecom` (facturas de telecomunicaciones), `hermes-of-efficiency` (uso de IA), `icarus-of-retries` (coste de los reintentos).

## Cómo funcionan

- Solo leen archivos exportados y nunca inician sesión en sistemas en producción.
- Redactan borradores; la aprobación es el clic de una persona con nombre, también en modo Auto. Las acciones en producción se rechazan.
- Nombres, usuarios, correos, teléfonos y direcciones de cliente se sustituyen por seudónimos para el modelo.
- Las exportaciones en nueve idiomas se leen igual (codificaciones, `1.234,56`, fechas, nombres de columna locales). Las páginas de informe siguen `--lang es`.

Resultados y decisiones: [REVIEW-ver1.md](REVIEW-ver1.md). No es asesoramiento jurídico, de cumplimiento ni de certificación.
