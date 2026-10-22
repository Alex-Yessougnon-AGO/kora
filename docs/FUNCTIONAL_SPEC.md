# Spécification fonctionnelle

## Dashboard
Afficher chiffre d'affaires, encaissements, dépenses, bénéfice estimé, nombre de ventes, solde à recevoir si implémenté, alertes de stock bas, graphique de ventes, transactions récentes et actions rapides. Les filtres recalculent les données. Ne pas confondre chiffre d'affaires, bénéfice et encaissements.

## Produits
Champs : id, nom, référence facultative, catégorie facultative, prix d'achat, prix de vente, quantité en stock, seuil d'alerte, unité facultative, dates de création/mise à jour.
Valider le nom, les prix non négatifs et les quantités. Refuser une vente supérieure au stock disponible par défaut.

## Vente
Une vente comprend une ou plusieurs lignes, qui conservent le nom et les prix au moment de l'opération.
Étapes : rechercher les produits, régler les quantités, vérifier le total, choisir espèces/Mobile Money saisi manuellement/autre, saisir le montant reçu et confirmer.
Règles :
- Total = somme quantité × prix de vente.
- Coût = somme quantité × prix d'achat au moment de la vente.
- Marge brute estimée = total - coût.
- Montant encaissé non négatif et pas supérieur au total, sauf gestion explicite de monnaie rendue.
- Solde dû = total - encaissé.
- Statut payé si solde nul, partiel/à crédit si solde positif.
- Le solde dû n'est pas un encaissement.
- Décrémenter le stock une seule fois après validation.
- Empêcher les doubles soumissions.
- Conserver les lignes et la transaction dans l'historique.

## Paiements ultérieurs
S'ils sont implémentés : référencer la vente, enregistrer montant/date/méthode, refuser un montant supérieur au solde, actualiser le statut sans modifier le total de vente.

## Dépenses
Champs : libellé, catégorie, montant strictement positif, date, note facultative. Les dépenses réduisent le résultat estimé, pas le chiffre d'affaires.
Résultat estimé après dépenses = marge brute estimée - dépenses saisies. Expliquer que taxes et charges non enregistrées ne sont pas incluses.

## Stock
Tracer les mouvements : initial, vente, réapprovisionnement, correction et annulation si prise en charge. Les annulations restaurent le stock une seule fois et conservent l'historique.

## Transactions
Recherche par référence ou produit, filtres période/statut/mode de paiement, détails complets, états sans données et sans résultats.

## Persistance
Données conservées après rechargement. Bouton de réinitialisation avec confirmation. Afficher une mention indiquant que les données sont stockées sur cet appareil. Gérer quota dépassé et données corrompues sans planter l'application.

## Accessibilité
Libellés visibles, erreurs près des champs, retours accessibles, focus visible, navigation clavier et dialogues correctement gérés.
