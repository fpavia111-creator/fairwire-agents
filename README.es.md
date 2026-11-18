# Agentes Fairwire de TI y redes

*Traducido por Claude; pendiente de revisión por un hablante nativo. El [README](README.md) en inglés es la versión de referencia.*

Treinta y un pequeños agentes MCP para equipos de TI. Cada uno tiene **una sola tarea**, como revisar reglas del cortafuegos, comprobar copias de seguridad, leer registros de inicio de sesión o revisar la factura de la nube, y no puede actuar fuera de ella. Leen los archivos que su equipo ya exporta de cortafuegos, controladores, proveedores de identidad, gestión de dispositivos, herramientas de copia, mesa de ayuda y consolas de la nube, escriben informes en su equipo y redactan notas. Todo cambio en un dispositivo, cortafuegos, zona DNS, directorio o cuenta en la nube sigue siendo **el clic de una persona con nombre**.

Parte de [Mythos Machines](https://fair-agents.com) (Fairwire en el sitio). El software es gratuito (MIT); usted paga un precio fijo por la puesta en marcha con sus archivos.

Licencia MIT · Node 20 o posterior · solo archivos locales · sin credenciales · sin dependencias · nombres y direcciones enmascarados para el modelo

## Pruébelo

```bash
npx -y fairwire-firewall-rules demo     # revisión de reglas del cortafuegos con datos ficticios
npx -y fairwire-sign-in-logs demo      # revisión de inicios de sesión con datos ficticios
```

## Los agentes

**Red y perímetro:** `fairwire-firewall-rules` (reglas del cortafuegos), `fairwire-network-traffic` (NetFlow, IPFIX, sFlow), `fairwire-vpn-access` (registros de VPN), `fairwire-dns-queries` (consultas DNS), `fairwire-dns-records` (higiene de zonas DNS), `fairwire-wifi-health` (controladores Wi-Fi), `fairwire-switch-ports` (puertos de switch y VLAN), `fairwire-dhcp-leases` (DHCP), `fairwire-call-quality` (calidad de llamadas).

**Identidad, correo y administradores:** `fairwire-sign-in-logs` (inicios de sesión), `fairwire-mfa-coverage` (cobertura de MFA), `fairwire-admin-roles` (roles con privilegios), `fairwire-directory-hygiene` (higiene del directorio), `fairwire-email-gateway` (pasarela de correo).

**Dispositivos y software:** `fairwire-asset-inventory` (conciliación con la CMDB), `fairwire-patch-status` (estado de parches), `fairwire-endpoint-protection` (protección de endpoints), `fairwire-mobile-devices` (dispositivos móviles), `fairwire-software-licenses` (instalaciones frente a licencias), `fairwire-print-fleet` (parque de impresoras).

**Operación y resiliencia:** `fairwire-backup-jobs` (copias de seguridad), `fairwire-restore-tests` (pruebas de restauración), `fairwire-uptime-incidents` (disponibilidad e incidentes), `fairwire-change-calendar` (calendario de cambios), `fairwire-ticket-sla` (SLA de tickets), `fairwire-log-retention` (retención de registros).

**Gasto de TI y uso de IA:** `fairwire-cloud-costs` (facturas de la nube), `fairwire-contract-renewals` (contratos y preavisos), `fairwire-telecom-bills` (facturas de telecomunicaciones), `fairwire-ai-usage` (uso de IA), `fairwire-api-retries` (coste de los reintentos).

## Cómo funcionan

- Solo leen archivos exportados y nunca inician sesión en sistemas en producción.
- Redactan borradores; la aprobación es el clic de una persona con nombre, también en modo Auto. Las acciones en producción se rechazan.
- Nombres, usuarios, correos, teléfonos y direcciones de cliente se sustituyen por seudónimos para el modelo.
- Las exportaciones en nueve idiomas se leen igual (codificaciones, `1.234,56`, fechas, nombres de columna locales). Las páginas de informe siguen `--lang es`.

Resultados y decisiones: [REVIEW-ver1.md](REVIEW-ver1.md). No es asesoramiento jurídico, de cumplimiento ni de certificación.
