import { Routes } from '@angular/router';
import { MisAulas } from './pages/mis-aulas/mis-aulas';
import { AulaDetalle } from './pages/aula-detalle/aula-detalle';
import { GrupoDetalle } from './pages/grupo-detalle/grupo-detalle';

export const routes: Routes = [
  { path: '', redirectTo: 'mis-aulas', pathMatch: 'full' },
  { path: 'mis-aulas', component: MisAulas },
  { path: 'aula/:id', component: AulaDetalle },
  { path: 'grupo/:id', component: GrupoDetalle },
  { path: '**', redirectTo: 'mis-aulas' },
];
