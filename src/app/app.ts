import { ApplicationRef, Component, OnDestroy, OnInit } from '@angular/core';
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
        <router-outlet (activate)="onActivate()"></router-outlet>
      </ng-template>
    </amplify-authenticator>
  `,
})
export class AppComponent implements OnInit, OnDestroy {
  private hubCancel?: () => void;

  constructor(
    private router: Router,
    private appRef: ApplicationRef,
    private authService: AuthService,
  ) {}

  ngOnInit() {
    this.hubCancel = Hub.listen('auth', ({ payload }) => {
      if (payload.event === 'signedIn') {
        this.authService.clearCache();
        setTimeout(() => {
          const url = this.router.url && this.router.url !== '/' ? this.router.url : '/mis-aulas';
          this.router.navigateByUrl(url);
          this.appRef.tick();
        }, 50);
      } else if (payload.event === 'signedOut') {
        this.authService.clearCache();
        this.appRef.tick();
      }
    });

    // Asegurar que si ya estaba autenticado al montar el slot, el router renderice la ruta activa
    setTimeout(() => {
      if (!this.router.navigated || this.router.url === '/') {
        this.router.navigateByUrl('/mis-aulas');
      }
      this.appRef.tick();
    }, 100);
  }

  ngOnDestroy() {
    this.hubCancel?.();
  }

  onActivate() {
    this.appRef.tick();
  }

  irInicio() {
    this.router.navigate(['/mis-aulas']);
  }

  cerrarSesion(signOutFn: () => void) {
    this.authService.clearCache();
    signOutFn();
  }
}
