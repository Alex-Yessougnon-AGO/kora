import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Accordion, type AccordionCategory } from '../../shared/libraryui/accordion';
import { Icon } from '../../shared/ui/icon';
import { PageHeader } from '../../shared/ui/page-header';

@Component({
  selector: 'app-help',
  imports: [RouterLink, PageHeader, Accordion, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './help.html',
  styleUrl: './help.scss',
})
export class HelpPage {
  protected readonly categories: AccordionCategory[] = [
    {
      label: 'Ventes & encaissements',
      icon: 'cart',
      items: [
        {
          question: 'Comment enregistrer une vente rapidement ?',
          answer:
            'Ouvrez « Nouvelle vente », recherchez les produits ou filtrez par catégorie, cliquez pour les ajouter au panier puis ajustez les quantités. Choisissez le moyen de paiement, saisissez le montant reçu et validez. Le stock, les encaissements et le tableau de bord sont mis à jour immédiatement.',
        },
        {
          question: 'Que se passe-t-il pour un paiement partiel ?',
          answer:
            'Le montant reçu est enregistré comme encaissement, le reste devient un solde dû. Une vente partiellement payée porte le statut « Partielle » ; sans aucun paiement, elle est « À crédit ». Le nom du client est requis dès qu’un solde reste dû.',
        },
        {
          question: 'Comment encaisser un solde plus tard ?',
          answer:
            'Allez dans « Transactions », ouvrez la vente concernée puis utilisez « Enregistrer un paiement ». Le montant ne peut pas dépasser le solde restant. Le total de la vente ne change pas : seul l’encaissement et le statut évoluent.',
        },
        {
          question: 'Le stock peut-il être décrémenté deux fois ?',
          answer:
            'Non. Le stock est décrémenté une seule fois, au moment de la validation de la vente. Le bouton de validation se désactive pendant l’enregistrement et une protection empêche la double soumission.',
        },
        {
          question: 'Puis-je vendre plus que le stock disponible ?',
          answer:
            'Non. Kora refuse toute quantité supérieure au stock disponible et affiche un message clair. Le bouton d’ajout est désactivé pour les produits en rupture.',
        },
      ],
    },
    {
      label: 'Stock & catalogue',
      icon: 'box',
      items: [
        {
          question: 'Comment ajouter un nouveau produit ?',
          answer:
            'Dans « Produits & stock », cliquez sur « Nouveau produit », renseignez le nom, les prix d’achat et de vente, la quantité initiale et le seuil d’alerte. Un mouvement « Stock initial » est créé automatiquement.',
        },
        {
          question: 'Comment fonctionne le seuil d’alerte ?',
          answer:
            'Lorsque la quantité en stock atteint ou passe sous le seuil, le produit apparaît dans les alertes du tableau de bord et le compteur de la navigation. Une rupture (stock à zéro) est signalée séparément.',
        },
        {
          question: 'Comment réapprovisionner un produit ?',
          answer:
            'Utilisez le bouton « + » sur la ligne du produit, saisissez la quantité ajoutée et une note facultative. Le stock augmente et un mouvement « Réapprovisionnement » est conservé dans l’historique.',
        },
        {
          question: 'Les changements de prix modifient-ils les anciennes ventes ?',
          answer:
            'Non. Chaque ligne de vente conserve une copie du nom, du prix de vente et du prix d’achat au moment de l’opération. Modifier le catalogue n’altère jamais l’historique.',
        },
        {
          question: 'Que fait une modification manuelle de quantité ?',
          answer:
            'Elle crée un mouvement « Correction » dans l’historique du stock, avec la différence exacte. Le stock reste ainsi traçable, même en cas d’inventaire.',
        },
      ],
    },
    {
      label: 'Dépenses & résultat',
      icon: 'wallet',
      items: [
        {
          question: 'Quelle est la différence entre chiffre d’affaires, encaissements et résultat ?',
          answer:
            'Le chiffre d’affaires est le total des ventes facturées. Les encaissements correspondent à l’argent réellement reçu, y compris les paiements ultérieurs. Le résultat estimé est la marge brute (ventes moins coût des marchandises) diminuée des dépenses saisies.',
        },
        {
          question: 'Les dépenses modifient-elles le chiffre d’affaires ?',
          answer:
            'Non. Une dépense réduit le résultat estimé, pas le chiffre d’affaires ni les encaissements. Elle est comptée à sa date de saisie.',
        },
        {
          question: 'Comment supprimer une dépense ?',
          answer:
            'Dans le journal des dépenses, utilisez l’icône de suppression puis confirmez. La dépense est retirée et le résultat estimé est recalculé immédiatement.',
        },
        {
          question: 'Les taxes sont-elles prises en compte ?',
          answer:
            'Non. Kora est un prototype de démonstration : les taxes, charges sociales et autres obligations ne sont pas calculés. Le résultat affiché est une estimation, pas une comptabilité certifiée.',
        },
      ],
    },
    {
      label: 'Données & confidentialité',
      icon: 'database',
      items: [
        {
          question: 'Où sont enregistrées mes données ?',
          answer:
            'Uniquement dans le stockage local de ce navigateur, sur cet appareil. Aucun serveur, cloud ou compte n’est utilisé. Vider les données du navigateur efface donc les enregistrements.',
        },
        {
          question: 'Comment sauvegarder ou exporter mes données ?',
          answer:
            'Dans « Paramètres », exportez les ventes et les dépenses en CSV, ou téléchargez une sauvegarde JSON complète. Ces exports sont générés localement.',
        },
        {
          question: 'Comment réinitialiser la démonstration ?',
          answer:
            'Dans « Paramètres » ou via le menu du compte, choisissez « Réinitialiser la démo ». Une confirmation explicite est demandée car l’action remplace toutes les données locales.',
        },
        {
          question: 'Les paiements Mobile Money sont-ils réels ?',
          answer:
            'Non. « Mobile Money » est un moyen de paiement saisi manuellement pour la démonstration. Aucune transaction MTN MoMo, Orange Money ou bancaire n’est exécutée.',
        },
        {
          question: 'Que faire si le stockage local est plein ?',
          answer:
            'Kora affiche un message sans bloquer l’application. Exportez vos données puis réinitialisez la démonstration, ou libérez de l’espace dans le navigateur. Une modification non enregistrée est refusée plutôt que perdue silencieusement.',
        },
      ],
    },
  ];

  protected readonly shortcuts = [
    { label: 'Enregistrer une vente', path: '/vente', icon: 'cart' as const },
    { label: 'Gérer le stock', path: '/produits', icon: 'box' as const },
    { label: 'Ouvrir le journal', path: '/transactions', icon: 'receipt' as const },
    { label: 'Paramètres et exports', path: '/parametres', icon: 'settings' as const },
  ];
}
