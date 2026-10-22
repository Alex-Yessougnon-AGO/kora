# Kora — Gestion de boutique

Application Angular (standalone, signals, Vitest) de gestion quotidienne pour petits commerces
francophones d'Afrique de l'Ouest : ventes, stock, dépenses, encaissements et soldes dus, en FCFA (XOF).

Prototype front-end : les données sont fictives, stockées dans le navigateur (`localStorage`).
Aucun backend, aucun paiement Mobile Money réel, aucune synchronisation multi-appareils.

## Démarrage

```bash
npm install
npm start          # http://localhost:4200
```

Autres commandes :

```bash
npm run build      # build production dans dist/kora
npm test           # tests unitaires Vitest (21 tests)
```

## Parcours couverts

| Écran | Route | Contenu |
| --- | --- | --- |
| Tableau de bord | `/tableau-de-bord` | Indicateurs de période, graphique ventes/encaissements, répartition des paiements, alertes de stock, rapport du jour, transactions récentes |
| Nouvelle vente | `/vente` | Catalogue filtrable, panier multi-produits, quantités bornées au stock, total/coût/marge, paiement complet ou partiel, confirmation |
| Produits & stock | `/produits` | Création/modification, validation, réapprovisionnement, mouvements de stock, recherche et filtres |
| Dépenses | `/depenses` | Saisie, catégories, suppression avec confirmation, export CSV |
| Transactions | `/transactions` | Recherche, filtres période/statut/moyen de paiement, détail de vente, paiements ultérieurs, annulation, export CSV |
| Paramètres | `/parametres` | Boutique, préférences d'affichage, réinitialisation des données de démonstration |
| Centre d'aide | `/aide` | Guide d'utilisation et règles de calcul |

Règles métier appliquées : le total et le coût d'une vente sont figés au moment de l'opération
(snapshots de nom et de prix), le stock est décrémenté exactement une fois, un solde dû n'est jamais
compté comme encaissement, les dépenses réduisent le résultat estimé sans toucher au chiffre
d'affaires, et les doubles soumissions sont bloquées par clé d'idempotence.

## Composants LibraryUI utilisés

Variante retenue : **Angular × Tailwind** (https://libraryui.com/components/tailwind).
Les quatre composants sont repris de la documentation LibraryUI, adaptés au thème Kora et
accessibles via `aria-*` / clavier. Ils sont regroupés dans `src/app/shared/libraryui/`.

| Composant | Catégorie | Sélecteur | Fichier | Source documentaire | Utilisé dans |
| --- | --- | --- | --- | --- | --- |
| Data table | Data | `app-lui-data-table` | `src/app/shared/libraryui/data-table.ts` | https://libraryui.com/components/tailwind/data-table-tw | Transactions (toolbar, tri, filtres, pagination) |
| Accordion | Autres | `app-lui-accordion` | `src/app/shared/libraryui/accordion.ts` | https://libraryui.com/components/tailwind/accordion-tw | Centre d'aide |
| Breadcrumb | Navigation | `app-breadcrumb` | `src/app/shared/libraryui/breadcrumb.ts` | https://libraryui.com/components/tailwind/breadcrumb-tw | Fil d'Ariane de chaque page (`shared/ui/page-header.ts`) |
| Dropdown (menu de compte) | Actions | `app-account-menu` | `src/app/shared/libraryui/account-menu.ts` | https://libraryui.com/components/tailwind/dropdown-tw | Barre supérieure |

Adaptations documentées dans chaque fichier : palette Kora (ivoire/blanc/vert forêt/menthe/ambre),
libellés français, montants XOF, fermeture du menu au clic extérieur et à `Échap`, `aria-expanded`
et `aria-controls` sur l'accordéon.

## Architecture

```
src/app/
  core/        modèles, règles métier, store (signals), persistance, métriques, périodes, formatage XOF, fixtures
  shared/
    libraryui/ composants LibraryUI (voir tableau ci-dessus)
    ui/        primitives Kora : dialog, confirm-dialog, toast, stat-card, sales-chart, status-badge, page-header, icon
  layout/      shell (sidebar, topbar, navigation mobile)
  features/    dashboard, sale, products, expenses, transactions, settings, help
```

- Une seule source de vérité : `StoreService` (signals) expose des données immuables ; toutes les
  opérations passent par `core/business.ts` (fonctions pures, testées).
- Les indicateurs sont recalculés à partir des mêmes enregistrements (`core/metrics.ts`).
- La persistance est isolée dans `core/persistence.ts` (version de schéma, quota dépassé et données
  corrompues gérées sans plantage), ce qui permet de la remplacer par une API.
- Les montants XOF sont des entiers ; le formatage et l'analyse sont centralisés dans `core/money.ts`.

## Design

Direction artistique et palette : `docs/UI_UX_SPEC.md`, appliquées dans `src/styles.scss` sous forme de
tokens CSS (`--kora-ivory`, `--kora-forest`, `--kora-action`, `--kora-mint`, `--kora-amber`, `--kora-ink`,
`--kora-muted`, `--kora-border`). Typographie : Instrument Sans pour l'interface et les titres,
Instrument Serif pour l'identité Kora (logo et nom de la boutique), chargées depuis Google Fonts dans
`src/index.html`. Chiffres financiers en tabular nums.

## Responsive et accessibilité

- Paliers testés : 360 px, 768 px, 1280 px (une colonne et navigation dédiée sur mobile, tableaux en
  cartes ou défilement contrôlé).
- Cibles tactiles ≥ 44 px, `:focus-visible` global, `prefers-reduced-motion` respecté.
- Libellés visibles, erreurs reliées aux champs (`aria-invalid`, `aria-describedby`), toasts et
  messages en `aria-live`, dialogues avec focus piégé et fermeture au clavier.
- Statuts de paiement indiqués par libellé et couleur, résumé textuel du graphique.

## Tests et vérifications

- `npx ng build` → build production réussie (bundle initial ≈ 344 kB brut / 93 kB transféré).
- `npm test` → 21 tests Vitest réussis (`core/business.spec.ts`, `core/metrics.spec.ts`) : calculs de
  vente, stock insuffisant, paiement partiel, paiements ultérieurs, annulation, dépenses, métriques.

## Déploiement statique

Le build produit `dist/kora/browser`. L'application utilise le routing Angular : configurer un
fallback SPA vers `index.html`.

- Vercel / Render (statique) : commande `npm run build`, dossier de sortie `dist/kora/browser`,
  rewrite `/* → /index.html`.
- GitHub Pages : publier `dist/kora/browser` et ajouter un `404.html` identique à `index.html`
  (ou un routeur en hash) pour les routes profondes.

Aucune URL de démonstration n'est fournie : elle ne sera annoncée qu'après déploiement et vérification.

## Limites connues

- Données locales au navigateur, effacées avec le stockage de l'appareil ; ce n'est pas une sauvegarde.
- Pas d'authentification, de rôles, de fiscalité ni de comptabilité complète.
- Mobile Money saisi manuellement : aucune connexion à un opérateur.
- Les prix ne sont pas réévalués sur les ventes passées (comportement voulu).
