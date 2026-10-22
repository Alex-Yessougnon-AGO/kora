# UI/UX Design Spec — Kora

## Direction artistique
SaaS premium, calme, précis et chaleureux. Éviter le template admin générique. Priorité à la lisibilité et à la confiance.

## Palette indicative
- Fond : `#F7F7F2`
- Surface : `#FFFFFF`
- Vert forêt : `#133D32`
- Vert action : `#16794B`
- Menthe pâle : `#E5F3E8`
- Ambre : `#E9B96E`
- Texte : `#202724`
- Texte secondaire : `#68716C`
- Bordure : `#E3E7E2`
Centraliser les tokens et vérifier les contrastes.

## Principes
- Typographie lisible et hiérarchie nette.
- Grille d'espacement cohérente de 4/8 px.
- Bordures fines, ombres rares, rayons cohérents.
- Chiffres financiers particulièrement lisibles.
- Éviter dégradés excessifs, glassmorphism, emojis comme icônes principales et cartes sans hiérarchie.

## Dashboard desktop
Sidebar, barre supérieure avec période et action principale, indicateurs essentiels, graphique et répartition des encaissements, alertes de stock et transactions récentes.

## Responsive
- Tablette : navigation compacte et grille à deux colonnes si lisible.
- Mobile : une colonne, navigation adaptée, indicateurs en grille si possible, tableau transformé en lignes/cartes ou scroll horizontal contrôlé.
- Cibles tactiles d'environ 44 px minimum.
- Formulaire de vente utilisable sur petit écran.
- Aucun débordement horizontal global non voulu.

## États
Données, chargement, vide, aucun résultat, validation invalide, succès, stock insuffisant, réinitialisation, stockage indisponible.

## LibraryUI
Vérifier les composants et imports exacts dans la documentation. Utiliser au moins quatre composants authentiques. Ne pas créer de faux composants portant les noms LibraryUI. Documenter leur nom, catégorie et emplacement dans README. Ne mélanger Bootstrap et Tailwind que si c'est réellement requis.

## Qualité
Focus visible, clavier, labels, contrastes, respect de `prefers-reduced-motion`, résumé textuel pour les graphiques. Tester à 360 px, 768 px et 1280 px.
