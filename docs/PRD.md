# PRD — Kora Challenge Edition

## Objectif
Créer en Angular un prototype de gestion commerciale utile et interactif, avec des composants LibraryUI authentiques. Priorité à la cohérence métier et à la qualité d'exécution.

## Utilisateurs
- Gérante de boutique : enregistre les ventes et surveille le stock.
- Employé de vente : retrouve un produit et enregistre une vente rapidement.
- Propriétaire : consulte tendances, dépenses, dettes et réapprovisionnement.

## Fonctionnalités indispensables
- Dashboard avec période sélectionnable.
- Catalogue de produits.
- Ventes multi-produits.
- Paiement complet ou partiel et solde restant.
- Enregistrement des dépenses.
- Mouvements de stock cohérents.
- Historique, recherche, filtres et détails de transaction.
- Alertes de stock bas.
- Persistance locale.
- Données de démonstration et action de réinitialisation avec confirmation.
- Responsive, états vides et erreurs.
- Au moins quatre composants LibraryUI réels, listés dans le README.

## Parcours principal
1. Ouvrir le dashboard.
2. Ouvrir « Nouvelle vente ».
3. Ajouter des produits et régler les quantités.
4. Choisir le mode de paiement et le montant reçu.
5. Confirmer.
6. Mettre à jour stock, transactions, encaissements et indicateurs.
7. Afficher une confirmation et retrouver la vente dans l'historique.

## Should-have
- Gestion simple des clients et des soldes dus.
- Paiements ultérieurs.
- Export CSV.
- Impression d'un rapport journalier.
- Clôture de journée.

## Hors périmètre
- Authentification réelle, rôles multi-utilisateurs, backend de production.
- Paiements Mobile Money réels, fiscalité certifiée, comptabilité complète.
- Synchronisation multi-appareils.
- IA générative ajoutée uniquement pour l'effet de mode.

## Critères de réussite
- Vente de bout en bout fonctionnelle.
- Données cohérentes, calculs dérivés des enregistrements.
- Stock et paiement corrects.
- Utilisation mobile.
- Build de production réussie.
- Composants LibraryUI authentiques identifiables.
- README exploitable.

## Principe
Mieux vaut quelques parcours vraiment fonctionnels que de nombreuses pages décoratives. Retirer ou terminer les interactions au lieu de laisser des boutons inactifs.
