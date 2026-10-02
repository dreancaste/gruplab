import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'mis-aulas', pathMatch: 'full' },
  {
    path: 'mis-aulas',
    loadComponent: () => import('./pages/mis-aulas/mis-aulas').then((m) => m.MisAulas),
  },
  {
    path: 'aula/:id',
    loadComponent: () => import('./pages/aula-detalle/aula-detalle').then((m) => m.AulaDetalle),
  },
  {
    path: 'grupo/:id',
    loadComponent: () => import('./pages/grupo-detalle/grupo-detalle').then((m) => m.GrupoDetalle),
  },
];
