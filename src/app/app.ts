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
        <header class="topbar">
          <div class="topbar-inner">
            <button class="brand" type="button" (click)="irInicio()" title="Ir a Mis aulas">
              <span class="brand-logo" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M4 19.5V6a2 2 0 0 1 2-2h11a1 1 0 0 1 1 1v14" stroke-linecap="round" />
                  <path d="M6 17h12" stroke-linecap="round" />
                  <path d="M8 7h6" stroke-linecap="round" />
                </svg>
              </span>
              <span class="brand-text">
                <span class="brand-name">GrupLab</span>
                <span class="brand-tag">Espacio colaborativo</span>
              </span>
            </button>

            <nav class="topnav" aria-label="Navegación principal">
              <button class="nav-item active" type="button" (click)="irInicio()">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                  aria-hidden="true"
                >
                  <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v18H6.5A2.5 2.5 0 0 0 4 23V5.5Z" />
                  <path d="M8 7h7M8 11h5" stroke-linecap="round" />
                </svg>
                Mis aulas
              </button>
            </nav>

            <div class="topbar-actions">
              <span class="user-chip" *ngIf="userEmail()" [title]="userEmail()!">
                <span class="avatar" aria-hidden="true">{{ userInitial }}</span>
                <span class="user-email">{{ userShort }}</span>
              </span>
              <button class="btn-logout" type="button" (click)="cerrarSesion(signOut)">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                  aria-hidden="true"
                >
                  <path
                    d="M15 17l5-5-5-5M20 12H9M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h7"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
                <span>Cerrar sesión</span>
              </button>
            </div>
          </div>
        </header>
        <main class="app-main">
          <router-outlet></router-outlet>
        </main>
      </ng-template>
    </amplify-authenticator>
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 100vh;
      }

      .topbar {
        position: sticky;
        top: 0;
        z-index: 50;
        background: rgba(255, 255, 255, 0.86);
        backdrop-filter: saturate(180%) blur(14px);
        border-bottom: 1px solid var(--border-subtle);
      }

      .topbar-inner {
        max-width: 1320px;
        margin: 0 auto;
        min-height: 68px;
        padding: 0.55rem 1.75rem;
        display: flex;
        align-items: center;
        gap: 1.25rem;
      }

      .brand {
        display: flex;
        align-items: center;
        gap: 0.7rem;
        cursor: pointer;
        user-select: none;
        background: transparent;
        border: 0;
        box-shadow: none;
        padding: 0.25rem 0.35rem 0.25rem 0.25rem;
        border-radius: 12px;
        color: var(--text-primary);
        text-align: left;

        &:hover:not(:disabled) {
          background: var(--surface-subtle);
          border: 0;
          color: var(--text-primary);
          box-shadow: none;
        }
      }

      .brand-logo {
        width: 40px;
        height: 40px;
        border-radius: 12px;
        background: linear-gradient(135deg, #3b6ef6 0%, #1d46b8 100%);
        color: #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: var(--shadow-brand);
        flex-shrink: 0;

        svg {
          width: 21px;
          height: 21px;
        }
      }

      .brand-text {
        display: flex;
        flex-direction: column;
        line-height: 1.15;
      }

      .brand-name {
        font-family: var(--font-display);
        font-size: 1.1rem;
        font-weight: 800;
        letter-spacing: -0.03em;
        color: var(--text-primary);
      }

      .brand-tag {
        font-size: 0.68rem;
        color: var(--text-muted);
        font-weight: 500;
        letter-spacing: 0.01em;
      }

      .topnav {
        display: flex;
        align-items: center;
        gap: 0.3rem;
        margin-left: 0.5rem;
      }

      .nav-item {
        display: inline-flex;
        align-items: center;
        gap: 0.45rem;
        padding: 0.48rem 0.85rem;
        border-radius: 10px;
        border: 1px solid transparent;
        background: transparent;
        box-shadow: none;
        color: var(--text-secondary);
        font-size: 0.875rem;
        font-weight: 600;

        svg {
          width: 18px;
          height: 18px;
        }

        &:hover:not(:disabled) {
          background: var(--surface-subtle);
          border-color: transparent;
          color: var(--text-primary);
          box-shadow: none;
        }

        &.active {
          background: var(--brand-50);
          border-color: var(--brand-100);
          color: var(--brand-700);
        }
      }

      .topbar-actions {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        margin-left: auto;
      }

      .user-chip {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.3rem 0.75rem 0.3rem 0.3rem;
        border-radius: 999px;
        background: var(--surface-subtle);
        border: 1px solid var(--border-subtle);
        font-size: 0.8rem;
        color: var(--text-secondary);
        font-weight: 600;
        max-width: 220px;
      }

      .avatar {
        width: 28px;
        height: 28px;
        border-radius: 999px;
        display: grid;
        place-items: center;
        background: linear-gradient(135deg, #101828 0%, #344054 100%);
        color: #ffffff;
        font-size: 0.75rem;
        font-weight: 700;
        flex-shrink: 0;
      }

      .user-email {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .btn-logout {
        background: transparent;
        border: 1px solid transparent;
        color: var(--text-secondary);
        padding: 0.46rem 0.8rem;
        border-radius: 10px;
        font-size: 0.82rem;
        font-weight: 600;
        box-shadow: none;

        svg {
          width: 17px;
          height: 17px;
        }

        &:hover:not(:disabled) {
          background: var(--danger-50);
          border-color: #fecdca;
          color: var(--danger-600);
          box-shadow: none;
        }
      }

      .app-main {
        min-height: calc(100vh - 68px);
      }

      @media (max-width: 760px) {
        .topbar-inner {
          padding: 0.5rem 1rem;
          gap: 0.75rem;
        }

        .brand-tag {
          display: none;
        }

        .user-email {
          display: none;
        }

        .user-chip {
          padding: 0.25rem;
          background: transparent;
          border-color: transparent;
        }

        .btn-logout span {
          display: none;
        }

        .btn-logout {
          padding: 0.46rem 0.55rem;
        }
      }

      @media (max-width: 520px) {
        .nav-item span {
          display: none;
        }

        .nav-item {
          padding: 0.48rem 0.6rem;
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
