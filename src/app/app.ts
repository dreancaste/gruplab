import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AmplifyAuthenticatorModule } from '@aws-amplify/ui-angular';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, AmplifyAuthenticatorModule],
  template: `
    <amplify-authenticator>
      <ng-template amplifySlot="authenticated" let-signOut="signOut">
        <header
          style="padding: 1rem; background: #222; color: white; display: flex; justify-content: space-between; align-items: center;"
        >
          <h2 style="margin: 0;">GrupLab</h2>
          <button
            (click)="signOut()"
            style="padding: 0.5rem 1rem; cursor: pointer; border: none; border-radius: 4px;"
          >
            Cerrar sesión
          </button>
        </header>
        <router-outlet></router-outlet>
      </ng-template>
    </amplify-authenticator>
  `,
})
export class AppComponent {}