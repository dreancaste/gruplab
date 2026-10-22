import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { AmplifyAuthenticatorModule } from '@aws-amplify/ui-angular';
import { Hub } from 'aws-amplify/utils';
import { AuthService } from './services/auth';

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
          <h2 style="margin: 0; cursor: pointer;" (click)="irInicio()">GrupLab</h2>
          <button
            (click)="cerrarSesion(signOut)"
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
export class AppComponent implements OnInit, OnDestroy {
  private hubCancel?: () => void;

  constructor(
    private router: Router,
    private authService: AuthService,
  ) {}

  ngOnInit() {
    this.hubCancel = Hub.listen('auth', ({ payload }) => {
      if (payload.event === 'signedIn' || payload.event === 'signedOut') {
        this.authService.clearCache();
      }
    });
  }

  ngOnDestroy() {
    this.hubCancel?.();
  }

  irInicio() {
    this.router.navigate(['/mis-aulas']);
  }

  cerrarSesion(signOutFn: () => void) {
    this.authService.clearCache();
    signOutFn();
  }
}
