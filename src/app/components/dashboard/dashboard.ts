import { Component } from '@angular/core';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  template: `
    <div style="padding: 2rem;">
      <h1>Panel de GrupLab</h1>
      <p>Bienvenida al dashboard. Aquí irá la lista de materias.</p>
    </div>
  `,
})
export class DashboardComponent {}