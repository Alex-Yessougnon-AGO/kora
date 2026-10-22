# Data Model — Kora

Modèles indicatifs à adapter au code existant.

## Product
`id`, `name`, `sku?`, `category?`, `purchasePrice`, `sellingPrice`, `stockQuantity`, `lowStockThreshold`, `unit?`, `createdAt`, `updatedAt`.

## Sale
`id`, `reference`, `createdAt`, `status: paid | partial | credit | cancelled`, `lines: SaleLine[]`, `totalAmount`, `costAmount`, `amountPaid`, `balanceDue`, `payments: Payment[]`, `cancelledAt?`.

## SaleLine
`productId`, `productNameSnapshot`, `quantity`, `unitSellingPrice`, `unitPurchasePrice`, `lineTotal`, `lineCost`.

## Payment
`id`, `saleId`, `amount`, `method: cash | mobile_money_manual | other`, `createdAt`, `note?`.

## Expense
`id`, `label`, `category`, `amount`, `createdAt`, `note?`.

## StockMovement
`id`, `productId`, `type: initial | sale | restock | adjustment | sale_cancelled`, `quantityDelta`, `referenceId?`, `reason?`, `createdAt`.

## Calculs
- Total vente = somme des lignes.
- Coût de vente = somme des coûts des lignes.
- Marge brute estimée = ventes non annulées - coût des marchandises vendues.
- Encaissements = somme des paiements enregistrés.
- Solde à recevoir = ventes non annulées - paiements associés.
- Résultat estimé après dépenses = marge brute estimée - dépenses de la période.
Tous les totaux doivent être dérivés des enregistrements ou recalculables de façon fiable. Les lignes de vente conservent les prix et noms au moment de l'opération.
