# Acceptance Tests — Kora

## Démarrage et LibraryUI
- [ ] Installation et démarrage décrits dans README.
- [ ] Build production réussie.
- [ ] Au moins quatre composants LibraryUI authentiques utilisés et documentés.
- [ ] Imports et configuration conformes à la documentation.

## Ventes
- [ ] Vente simple et multi-produits enregistrées correctement.
- [ ] Total et coût calculés correctement.
- [ ] Stock décrémenté une seule fois.
- [ ] Vente au-delà du stock refusée avec message clair.
- [ ] Paiement complet produit statut payé.
- [ ] Paiement partiel conserve le solde exact.
- [ ] Solde dû non compté comme encaissement.
- [ ] Double clic ne crée pas deux ventes.
- [ ] Historique conservé après rechargement.
- [ ] Prix historiques non modifiés par les changements du catalogue.

## Produits, stock et dépenses
- [ ] Création/modification produit valide.
- [ ] Prix négatifs et noms vides refusés.
- [ ] Alerte au seuil de stock.
- [ ] Mouvements de stock traçables.
- [ ] Dépense modifie le résultat, pas le chiffre d'affaires.
- [ ] Annulation, si implémentée, restaure le stock une seule fois.

## Dashboard et transactions
- [ ] Filtre période actualise indicateurs et graphique.
- [ ] Graphique cohérent avec les transactions.
- [ ] Recherche et filtres fonctionnels.
- [ ] Détails montrent lignes, total, paiement et solde.
- [ ] États vides et aucun résultat utiles.

## Responsive/accessibilité
- [ ] 360 px sans débordement horizontal global non voulu.
- [ ] 768 px et 1280 px correctement adaptés.
- [ ] Parcours principal au clavier.
- [ ] Labels et focus accessibles.
- [ ] Statuts pas uniquement différenciés par couleur.

## Livraison
- [ ] README, commandes, limites et composants documentés.
- [ ] Aucun secret dans le dépôt.
- [ ] Démo vérifiée si publiée.
- [ ] Rapport final distingue tests réussis, échecs et éléments non terminés.
