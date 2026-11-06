import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet } from '@angular/router';
import { AmplifyAuthenticatorModule } from '@aws-amplify/ui-angular';
import { Hub } from 'aws-amplify/utils';
import { AuthService } from './services/auth';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, AmplifyAuthenticatorModule],
  template: `
    <amplify-authenticator>
      <ng-template amplifySlot="authenticated" let-signOut="signOut">
        <header class="navbar">
          <div class="navbar-left">
            <button class="logo" type="button" (click)="irInicio()" title="Ir a Mis aulas">
              <span class="logo-icon" aria-hidden="true">GL</span>
              <span class="logo-text">Grup<span class="logo-accent">Lab</span></span>
            </button>
            <span class="nav-pill">Espacio colaborativo</span>
          </div>

          <div class="navbar-right">
            <button class="nav-button" type="button" (click)="irInicio()">Mis aulas</button>
            <span class="user-chip" *ngIf="userEmail()" [title]="userEmail()!">
              <span class="user-name">{{ userShort }}</span>
              <span class="user-avatar" aria-hidden="true">{{ userInitial }}</span>
            </span>
            <button class="btn-outline btn-logout" type="button" (click)="cerrarSesion(signOut)">
              Salir
            </button>
          </div>
        </header>
        <main class="app-main">
          <router-outlet></router-outlet>
        </main>
        <footer class="app-footer">
          <p>GrupLab · Gestión de trabajos grupales</p>
        </footer>
      </ng-template>
    </amplify-authenticator>
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 100vh;
      }

      .navbar {
        width: 100%;
        background-color: var(--bg-cream);
        border-bottom: 1.5px solid var(--border-dark);
        padding: 0.9rem 2.5rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        flex-wrap: wrap;
      }

      .navbar-left,
      .navbar-right {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        flex-wrap: wrap;
      }

      .logo {
        display: inline-flex;
        align-items: center;
        gap: 0.55rem;
        text-decoration: none;
        background: transparent;
        border: 0;
        box-shadow: none;
        padding: 0;
        margin: 0;
        border-radius: 0;
        color: var(--text-main);

        &:hover:not(:disabled) {
          background: transparent;
          border: 0;
          box-shadow: none;
          transform: none;
        }
      }

      .logo-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 2.2rem;
        height: 2.2rem;
        background-color: var(--orange);
        color: #ffffff;
        font-size: 1.15rem;
        font-weight: 800;
        border: 1.5px solid var(--border-dark);
        border-radius: 9px;
        box-shadow: 2px 2px 0 var(--border-dark);
      }

      .logo-text {
        font-size: 1.35rem;
        font-weight: 800;
        letter-spacing: -0.5px;
        color: var(--text-main);
      }

      .logo-accent {
        color: var(--blue);
      }

      .nav-pill {
        background-color: var(--bg-pill);
        color: var(--text-main);
        font-size: 0.85rem;
        font-weight: 600;
        padding: 0.4rem 0.9rem;
        border-radius: 999px;
        border: 1.5px solid var(--border-dark);
        box-shadow: var(--shadow-xs);
      }

      .nav-button {
        background: var(--bg-white);
        color: var(--text-main);
        border: 1.5px solid var(--border-dark);
        box-shadow: var(--shadow-xs);
        padding: 0.4rem 0.9rem;
        font-size: 0.85rem;
        font-weight: 700;
        border-radius: 999px;

        &:hover:not(:disabled) {
          background: var(--bg-pill);
          transform: translate(-1px, -1px);
          box-shadow: var(--shadow-sm);
        }
      }

      .user-chip {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.25rem 0.35rem 0.25rem 0.75rem;
        background: var(--bg-white);
        border: 1.5px solid var(--border-dark);
        border-radius: 999px;
        box-shadow: var(--shadow-xs);
      }

      .user-name {
        font-size: 0.85rem;
        font-weight: 600;
        color: var(--text-main);
        max-width: 180px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .user-avatar {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 2.2rem;
        height: 2.2rem;
        background-color: var(--blue);
        color: #ffffff;
        font-size: 0.8rem;
        font-weight: 700;
        border: 1.5px solid var(--border-dark);
        border-radius: 50%;
        box-shadow: 1px 1px 0 var(--border-dark);
      }

      .btn-logout {
        background: var(--bg-white);
        color: var(--text-main);
        border: 1.5px solid var(--border-dark);
        box-shadow: var(--shadow-xs);
        padding: 0.4rem 0.9rem;
        font-size: 0.85rem;
        font-weight: 700;
        border-radius: 999px;

        &:hover:not(:disabled) {
          background: var(--danger-50);
          color: var(--danger-600);
          transform: translate(-1px, -1px);
          box-shadow: var(--shadow-sm);
        }
      }

      .app-main {
        width: 100%;
        max-width: 1080px;
        margin: 2rem auto 2.5rem;
        padding: 0 2rem;
        flex: 1;
      }

      .app-footer {
        width: 100%;
        border-top: 1.5px solid var(--border-dark);
        padding: 1rem 2.5rem;
        text-align: center;
        background-color: var(--bg-cream);
        margin-top: auto;
      }

      .app-footer p {
        margin: 0;
        font-size: 0.85rem;
        font-weight: 600;
        color: var(--text-muted);
      }

      @media (max-width: 760px) {
        .navbar {
          padding: 0.75rem 1rem;
        }

        .user-name {
          display: none;
        }

        .user-chip {
          padding: 0.2rem;
          background: transparent;
          border-color: transparent;
          box-shadow: none;
        }

        .app-main {
          padding: 0 1rem;
          margin: 1.25rem auto 2rem;
        }
      }
    `,
  ],
})
export class AppComponent implements OnInit, OnDestroy {
  private hubCancel?: () => void;
  userEmail = signal<string | null>(null);

  constructor(
    private router: Router,
    private authService: AuthService,
  ) {}

  get userInitial(): string {
    const email = this.userEmail();
    return email ? email.charAt(0).toUpperCase() : 'U';
  }

  get userShort(): string {
    const email = this.userEmail();
    if (!email) return '';
    return email.split('@')[0];
  }

  ngOnInit() {
    this.cargarEmail();
    this.hubCancel = Hub.listen('auth', ({ payload }) => {
      if (payload.event === 'signedIn' || payload.event === 'signedOut') {
        this.authService.clearCache();
        if (payload.event === 'signedIn') {
          this.cargarEmail();
        } else {
          this.userEmail.set(null);
          this.router.navigate(['/mis-aulas']);
        }
      }
    });
  }

  private cargarEmail() {
    this.authService
      .getEmail?.()
      .then((email) => {
        if (email) this.userEmail.set(email);
      })
      .catch(() => {});
  }

  ngOnDestroy() {
    this.hubCancel?.();
  }

  irInicio() {
    this.router.navigate(['/mis-aulas']);
  }

  cerrarSesion(signOutFn: () => void) {
    this.authService.clearCache();
    this.userEmail.set(null);
    this.router.navigate(['/mis-aulas']);
    signOutFn();
  }
}
