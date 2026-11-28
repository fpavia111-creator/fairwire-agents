# Agents Fairwire pour l’informatique et le réseau

*Traduit par Claude ; relecture par un locuteur natif en attente. Le [README](README.md) anglais fait foi.*

Trente et un petits agents MCP pour les équipes informatiques. Chacun a **une seule tâche**, par exemple revoir les règles de pare-feu, contrôler les sauvegardes, lire les journaux de connexion ou examiner la facture cloud, et ne peut pas agir au-delà. Ils lisent les fichiers que votre équipe exporte déjà des pare-feu, contrôleurs, fournisseurs d’identité, outils de gestion des appareils, de sauvegarde, de support et des consoles cloud, écrivent des rapports sur votre machine et rédigent des notes. Toute modification d’un équipement, d’un pare-feu, d’une zone DNS, d’un annuaire ou d’un compte cloud reste **le clic d’une personne nommée**.

Fait partie de [Fair Agents](https://fair-agents.com) (Fairwire sur le site). Le logiciel est gratuit (MIT) ; vous payez un prix fixe pour la mise en place sur vos fichiers.

Licence MIT · Node 20 ou plus récent · fichiers locaux uniquement · aucun identifiant · aucune dépendance · noms et adresses masqués pour le modèle

## Essayer

```bash
npx -y fairwire-firewall-rules demo     # revue des règles de pare-feu sur des données fictives
npx -y fairwire-sign-in-logs demo      # revue des journaux de connexion sur des données fictives
```

## Les agents

**Réseau et périmètre :** `fairwire-firewall-rules` (règles de pare-feu), `fairwire-network-traffic` (NetFlow, IPFIX, sFlow), `fairwire-vpn-access` (journaux VPN), `fairwire-dns-queries` (requêtes DNS), `fairwire-dns-records` (hygiène des zones DNS), `fairwire-wifi-health` (contrôleurs Wi-Fi), `fairwire-switch-ports` (ports de commutateur et VLAN), `fairwire-dhcp-leases` (DHCP), `fairwire-call-quality` (qualité des appels).

**Identité, messagerie et administrateurs :** `fairwire-sign-in-logs` (journaux de connexion), `fairwire-mfa-coverage` (couverture MFA), `fairwire-admin-roles` (rôles à privilèges), `fairwire-directory-hygiene` (hygiène de l’annuaire), `fairwire-email-gateway` (passerelle de messagerie).

**Appareils et logiciels :** `fairwire-asset-inventory` (rapprochement avec la CMDB), `fairwire-patch-status` (état des correctifs), `fairwire-endpoint-protection` (protection des postes), `fairwire-mobile-devices` (appareils mobiles), `fairwire-software-licenses` (installations face aux licences), `fairwire-print-fleet` (parc d’imprimantes).

**Exploitation et résilience :** `fairwire-backup-jobs` (sauvegardes), `fairwire-restore-tests` (tests de restauration), `fairwire-uptime-incidents` (disponibilité et incidents), `fairwire-change-calendar` (calendrier des changements), `fairwire-ticket-sla` (SLA des tickets), `fairwire-log-retention` (conservation des journaux).

**Dépenses informatiques et usage de l’IA :** `fairwire-cloud-costs` (factures cloud), `fairwire-contract-renewals` (contrats et préavis), `fairwire-telecom-bills` (factures télécom), `fairwire-ai-usage` (usage de l’IA), `fairwire-api-retries` (coût des nouvelles tentatives).

## Fonctionnement

- Ils lisent seulement des fichiers exportés et ne se connectent jamais aux systèmes en production.
- Ils rédigent des brouillons ; l’approbation est le clic d’une personne nommée, même en mode Auto. Les actions en production sont refusées.
- Noms, identifiants, adresses e-mail, numéros de téléphone et adresses des clients sont remplacés par des pseudonymes pour le modèle.
- Les exports en neuf langues se lisent de la même façon (encodages, `1 234,56`, dates, noms de colonnes locaux). Les pages de rapport suivent `--lang fr`.

Résultats et décisions : [docs/](docs/). Ce n’est pas un conseil juridique, de conformité ou de certification.
