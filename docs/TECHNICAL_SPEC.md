# Technical Spec — Angular

## Audit initial
Inspecter le dépôt, les scripts, versions, dépendances, conventions et statut Git avant toute modification. Préserver les changements existants.

## Stack
Angular + TypeScript et une variante LibraryUI réellement documentée. Choisir Angular × Tailwind ou Angular × Bootstrap selon le dépôt et les composants disponibles. Ne pas inventer de noms de paquets, imports, composants ou API. Réutiliser les outils de test existants.

## Architecture recommandée
Adapter aux conventions existantes :
- `core/` services globaux, configuration, erreurs ;
- `shared/` composants locaux et intégration LibraryUI ;
- `features/dashboard/` ;
- `features/sales/` ;
- `features/inventory/` ;
- `features/expenses/` ;
- `features/transactions/` ;
- `features/reports/` si nécessaire ;
- couche data pour modèles, règles métier, fixtures et persistance.

Utiliser les composants standalone si compatible avec la version et les conventions du projet. Éviter les abstractions inutiles.

## État et métier
Une seule source de vérité. Les indicateurs dérivent des mêmes données. Centraliser les calculs métier et le formatage XOF. Pour le XOF, privilégier les montants entiers plutôt que les nombres flottants.

## Persistance
Isoler le stockage derrière une interface de dépôt pour pouvoir introduire une API plus tard. Prévoir gestion d'erreur, version minimale du schéma et opérations de vente cohérentes. Empêcher les doubles clics.

## Sécurité
Aucun secret ni donnée personnelle réelle. Aucun HTML utilisateur non fiable injecté. Confirmer les opérations destructives. Ne pas présenter le stockage local comme une sauvegarde cloud sécurisée.

## Performance
Éviter les dépendances lourdes inutiles, les calculs répétés dans les templates et les identifiants basés sur l'index des tableaux. Corriger les erreurs TypeScript, build et console.

## Déploiement
Préparer une build production et documenter un déploiement statique compatible Angular (GitHub Pages, Vercel ou Render selon routing). Configurer le fallback SPA si nécessaire. Ne déclarer une URL déployée qu'après vérification.
