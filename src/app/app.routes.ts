import type { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'tableau-de-bord',
  },
  {
    path: 'tableau-de-bord',
    title: 'Tableau de bord · Kora',
    loadComponent: () => import('./features/dashboard/dashboard').then((module) => module.Dashboard),
  },
  {
    path: 'vente',
    title: 'Nouvelle vente · Kora',
    loadComponent: () => import('./features/sale/sale').then((module) => module.SalePage),
  },
  {
    path: 'produits',
    title: 'Produits & stock · Kora',
    loadComponent: () => import('./features/products/products').then((module) => module.ProductsPage),
  },
  {
    path: 'depenses',
    title: 'Dépenses · Kora',
    loadComponent: () => import('./features/expenses/expenses').then((module) => module.ExpensesPage),
  },
  {
    path: 'transactions',
    title: 'Transactions · Kora',
    loadComponent: () =>
      import('./features/transactions/transactions').then((module) => module.TransactionsPage),
  },
  {
    path: 'aide',
    title: 'Centre d’aide · Kora',
    loadComponent: () => import('./features/help/help').then((module) => module.HelpPage),
  },
  {
    path: 'parametres',
    title: 'Paramètres · Kora',
    loadComponent: () => import('./features/settings/settings').then((module) => module.SettingsPage),
  },
  {
    path: '**',
    redirectTo: 'tableau-de-bord',
  },
];
