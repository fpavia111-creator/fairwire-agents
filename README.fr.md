# Agents Fairwire pour l’informatique et le réseau

*Traduit par Claude ; relecture par un locuteur natif en attente. Le [README](README.md) anglais fait foi.*

Trente et un petits agents MCP pour les équipes informatiques. Chacun a **une seule tâche**, par exemple revoir les règles de pare-feu, contrôler les sauvegardes, lire les journaux de connexion ou examiner la facture cloud, et ne peut pas agir au-delà. Ils lisent les fichiers que votre équipe exporte déjà des pare-feu, contrôleurs, fournisseurs d’identité, outils de gestion des appareils, de sauvegarde, de support et des consoles cloud, écrivent des rapports sur votre machine et rédigent des notes. Toute modification d’un équipement, d’un pare-feu, d’une zone DNS, d’un annuaire ou d’un compte cloud reste **le clic d’une personne nommée**.

Fait partie de [Mythos Machines](https://fair-agents.com) (Fairwire sur le site). Le logiciel est gratuit (MIT) ; vous payez un prix fixe pour la mise en place sur vos fichiers.

Licence MIT · Node 20 ou plus récent · fichiers locaux uniquement · aucun identifiant · aucune dépendance · noms et adresses masqués pour le modèle

## Essayer

```bash
npx -y boreas-of-firewalls demo     # revue des règles de pare-feu sur des données fictives
npx -y angelia-of-signins demo      # revue des journaux de connexion sur des données fictives
```

## Les agents

**Réseau et périmètre :** `boreas-of-firewalls` (règles de pare-feu), `iris-of-traffic` (NetFlow, IPFIX, sFlow), `zephyrus-of-vpn` (journaux VPN), `notus-of-dns` (requêtes DNS), `etesian-of-zones` (hygiène des zones DNS), `aura-of-wifi` (contrôleurs Wi-Fi), `eurus-of-switchports` (ports de commutateur et VLAN), `kaikias-of-leases` (DHCP), `echo-of-voip` (qualité des appels).

**Identité, messagerie et administrateurs :** `angelia-of-signins` (journaux de connexion), `bora-of-mfa` (couverture MFA), `arke-of-admins` (rôles à privilèges), `tramontane-of-directory` (hygiène de l’annuaire), `pheme-of-gateways` (passerelle de messagerie).

**Appareils et logiciels :** `argestes-of-assets` (rapprochement avec la CMDB), `skiron-of-patches` (état des correctifs), `apeliotes-of-endpoints` (protection des postes), `eurybates-of-mobiles` (appareils mobiles), `levante-of-software` (installations face aux licences), `ostro-of-printers` (parc d’imprimantes).

**Exploitation et résilience :** `meltemi-of-backups` (sauvegardes), `aparctias-of-restores` (tests de restauration), `stentor-of-incidents` (disponibilité et incidents), `ceryx-of-changes` (calendrier des changements), `talthybius-of-tickets` (SLA des tickets), `ossa-of-logs` (conservation des journaux).

**Dépenses informatiques et usage de l’IA :** `sirocco-of-cloud` (factures cloud), `chinook-of-renewals` (contrats et préavis), `libeccio-of-telecom` (factures télécom), `hermes-of-efficiency` (usage de l’IA), `icarus-of-retries` (coût des nouvelles tentatives).

## Fonctionnement

- Ils lisent seulement des fichiers exportés et ne se connectent jamais aux systèmes en production.
- Ils rédigent des brouillons ; l’approbation est le clic d’une personne nommée, même en mode Auto. Les actions en production sont refusées.
- Noms, identifiants, adresses e-mail, numéros de téléphone et adresses des clients sont remplacés par des pseudonymes pour le modèle.
- Les exports en neuf langues se lisent de la même façon (encodages, `1 234,56`, dates, noms de colonnes locaux). Les pages de rapport suivent `--lang fr`.

Résultats et décisions : [REVIEW-ver1.md](REVIEW-ver1.md). Ce n’est pas un conseil juridique, de conformité ou de certification.
