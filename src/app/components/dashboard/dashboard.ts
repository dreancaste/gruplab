import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { Schema } from '../../../../amplify/data/resource';

type Grupo = Schema['Grupo']['type'];
type Card = Schema['Card']['type'];

export interface ResumenGrupoDashboard {
  grupo: Grupo;
  totalCards: number;
  backlog: number;
  progreso: number;
  revision: number;
  hecho: number;
  porcentajeAvance: number;
  promedioNota: number | null;
  vencidas: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class DashboardComponent {
  @Input() grupos: Grupo[] = [];
  @Input() cardsPorGrupo: Record<string, Card[]> = {};
  @Input() totalAlumnos = 0;

  get todasLasCards(): Card[] {
    return Object.values(this.cardsPorGrupo).flat();
  }

  get totalTareas(): number {
    return this.todasLasCards.length;
  }

  get tareasCompletadas(): number {
    return this.todasLasCards.filter((c) => c.estado === 'hecho').length;
  }

  get porcentajeGlobal(): number {
    if (this.totalTareas === 0) return 0;
    return Math.round((this.tareasCompletadas / this.totalTareas) * 100);
  }

  get promedioGeneralNota(): number | null {
    const puntuadas = this.todasLasCards.filter(
      (c) => typeof c.puntuacion === 'number' && c.puntuacion > 0,
    );
    if (puntuadas.length === 0) return null;
    const suma = puntuadas.reduce((acc, c) => acc + (c.puntuacion ?? 0), 0);
    return Math.round((suma / puntuadas.length) * 10) / 10;
  }

  get tareasVencidasGlobal(): number {
    const hoy = new Date().toISOString().slice(0, 10);
    return this.todasLasCards.filter(
      (c) => c.estado !== 'hecho' && !!c.fechaLimite && c.fechaLimite < hoy,
    ).length;
  }

  get resumenPorGrupo(): ResumenGrupoDashboard[] {
    const hoy = new Date().toISOString().slice(0, 10);
    return this.grupos.map((grupo) => {
      const cards = this.cardsPorGrupo[grupo.id] ?? [];
      const totalCards = cards.length;
      const backlog = cards.filter((c) => c.estado === 'backlog').length;
      const progreso = cards.filter((c) => c.estado === 'progreso').length;
      const revision = cards.filter((c) => c.estado === 'revision').length;
      const hecho = cards.filter((c) => c.estado === 'hecho').length;
      const porcentajeAvance = totalCards > 0 ? Math.round((hecho / totalCards) * 100) : 0;

      const puntuadas = cards.filter(
        (c) => typeof c.puntuacion === 'number' && c.puntuacion > 0,
      );
      const promedioNota =
        puntuadas.length > 0
          ? Math.round(
              (puntuadas.reduce((acc, c) => acc + (c.puntuacion ?? 0), 0) / puntuadas.length) * 10,
            ) / 10
          : null;

      const vencidas = cards.filter(
        (c) => c.estado !== 'hecho' && !!c.fechaLimite && c.fechaLimite < hoy,
      ).length;

      return {
        grupo,
        totalCards,
        backlog,
        progreso,
        revision,
        hecho,
        porcentajeAvance,
        promedioNota,
        vencidas,
      };
    });
  }
}
