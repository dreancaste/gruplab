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
    @if (verificandoSesion()) {
      <div class="session-loader" aria-live="polite">
        <span class="logo-circle">G</span>
        <span>Cargando GrupLab...</span>
      </div>
    } @else if (autenticado()) {
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
          <button class="btn-outline btn-logout" type="button" (click)="cerrarSesion()">
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
    } @else {
      <div class="landing-shell">
        <header class="landing-nav">
          <div class="landing-brand">
            <span class="logo-circle" aria-hidden="true">G</span>
            <span class="logo-text">Grup<span class="logo-accent">Lab</span></span>
          </div>
          <div class="landing-nav-actions">
            <button class="btn-ghost" type="button" (click)="abrirAuth('signIn')">
              Ingresar
            </button>
            <button class="btn-cta-sm" type="button" (click)="abrirAuth('signUp')">
              Crear cuenta
            </button>
          </div>
        </header>

        <section class="hero">
          <div class="hero-copy">
            <span class="hero-badge">PARA DOCENTES Y ESTUDIANTES</span>
            <h1 class="hero-title">
              El trabajo en grupo,
              <span class="hl-underline">visible</span> y
              <span class="hl-blue">justo.</span>
            </h1>
            <p class="hero-subtitle">
              GrupLab reemplaza la mezcla de WhatsApp, Drive y mails por un único espacio donde el
              progreso se ve en tiempo real y el aporte de cada integrante queda registrado.
            </p>
            <div class="hero-actions">
              <button class="btn-cta-lg" type="button" (click)="abrirAuth('signUp')">
                Empezar gratis <span aria-hidden="true">→</span>
              </button>
              <button class="btn-secondary-lg" type="button" (click)="scrollAComoFunciona()">
                Cómo funciona
              </button>
            </div>
          </div>

          <div class="hero-visual" aria-hidden="true">
            <div class="illustration-frame">
              <svg viewBox="0 0 460 340" class="hero-svg" xmlns="http://www.w3.org/2000/svg">
                <rect width="460" height="340" fill="#fffdf8" />
                <!-- Decorative background shapes -->
                <circle cx="240" cy="170" r="135" fill="#fff4d6" />
                <rect x="44" y="102" width="22" height="22" rx="4" fill="#ffd84d" stroke="#1a1a1a" stroke-width="2" />
                <rect x="385" y="232" width="20" height="20" rx="4" fill="#2563eb" stroke="#1a1a1a" stroke-width="2" />
                <circle cx="348" cy="48" r="10" fill="#ff5a1f" stroke="#1a1a1a" stroke-width="2" />

                <!-- Kanban Cards floating -->
                <g transform="translate(150, 26)">
                  <rect width="128" height="72" rx="10" fill="#ff5a1f" stroke="#1a1a1a" stroke-width="2.5" />
                  <circle cx="24" cy="24" r="10" fill="#fffdf8" />
                  <rect x="44" y="17" width="66" height="7" rx="3.5" fill="#ffd9cc" />
                  <rect x="44" y="31" width="48" height="7" rx="3.5" fill="#ffd9cc" />
                  <rect x="16" y="48" width="94" height="8" rx="4" fill="#e64d15" />
                </g>

                <g transform="translate(166, 114)">
                  <rect width="118" height="74" rx="10" fill="#2563eb" stroke="#1a1a1a" stroke-width="2.5" />
                  <circle cx="24" cy="24" r="10" fill="#1d4ed8" stroke="#ffffff" stroke-width="1.5" />
                  <rect x="42" y="18" width="60" height="7" rx="3.5" fill="#ffffff" />
                  <rect x="42" y="32" width="44" height="7" rx="3.5" fill="#bfdbfe" />
                  <rect x="16" y="50" width="84" height="8" rx="4" fill="#93c5fd" />
                </g>

                <g transform="translate(302, 74)">
                  <rect width="94" height="62" rx="9" fill="#ffd84d" stroke="#1a1a1a" stroke-width="2.5" />
                  <circle cx="22" cy="24" r="8" fill="#ff5a1f" />
                  <rect x="38" y="18" width="42" height="6" rx="3" fill="#b45309" />
                  <rect x="38" y="30" width="32" height="6" rx="3" fill="#b45309" />
                  <rect x="14" y="44" width="66" height="6" rx="3" fill="#d97706" />
                </g>

                <!-- Checkmark badge -->
                <g transform="translate(308, 22)">
                  <rect width="34" height="34" rx="8" fill="#2563eb" stroke="#1a1a1a" stroke-width="2.5" />
                  <path d="M 9 17 L 15 23 L 26 11" stroke="#ffffff" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round" />
                </g>

                <!-- Left student -->
                <g transform="translate(30, 88)">
                  <circle cx="52" cy="40" r="24" fill="#5c3a21" stroke="#1a1a1a" stroke-width="2.5" />
                  <circle cx="54" cy="48" r="18" fill="#a1623b" stroke="#1a1a1a" stroke-width="2.5" />
                  <path d="M 16 142 C 16 96, 88 96, 94 142 L 94 196 L 16 196 Z" fill="#ff5a1f" stroke="#1a1a1a" stroke-width="2.5" />
                  <rect x="12" y="138" width="42" height="58" rx="4" fill="#2563eb" stroke="#1a1a1a" stroke-width="2.5" />
                  <path d="M 80 108 L 130 62" stroke="#a1623b" stroke-width="12" stroke-linecap="round" />
                </g>

                <!-- Center student with laptop -->
                <g transform="translate(120, 178)">
                  <circle cx="56" cy="36" r="20" fill="#fde6d2" stroke="#1a1a1a" stroke-width="2.5" />
                  <path d="M 35 32 C 35 12, 78 12, 78 32 Z" fill="#1a1a1a" />
                  <circle cx="50" cy="36" r="6" fill="none" stroke="#1a1a1a" stroke-width="2" />
                  <circle cx="64" cy="36" r="6" fill="none" stroke="#1a1a1a" stroke-width="2" />
                  <path d="M 22 108 C 22 72, 92 72, 92 108 L 92 140 L 22 140 Z" fill="#2563eb" stroke="#1a1a1a" stroke-width="2.5" />
                  <polygon points="8,92 86,92 98,140 20,140" fill="#d1d5db" stroke="#1a1a1a" stroke-width="2.5" />
                </g>

                <!-- Right-center student pointing -->
                <g transform="translate(230, 166)">
                  <circle cx="52" cy="34" r="18" fill="#fde6d2" stroke="#1a1a1a" stroke-width="2.5" />
                  <path d="M 34 28 C 34 10, 72 10, 72 28 Z" fill="#ffd84d" stroke="#1a1a1a" stroke-width="2" />
                  <path d="M 24 104 C 24 68, 80 68, 80 104 L 80 152 L 24 152 Z" fill="#fffdf8" stroke="#1a1a1a" stroke-width="2.5" />
                  <path d="M 32 76 L 4 24" stroke="#fde6d2" stroke-width="11" stroke-linecap="round" />
                </g>

                <!-- Far-right student -->
                <g transform="translate(342, 76)">
                  <circle cx="52" cy="40" r="20" fill="#fde6d2" stroke="#1a1a1a" stroke-width="2.5" />
                  <path d="M 30 34 C 30 12, 74 12, 72 34 C 60 22, 42 22, 30 34 Z" fill="#c2592b" stroke="#1a1a1a" stroke-width="2" />
                  <path d="M 18 118 C 18 78, 86 78, 88 118 L 88 210 L 18 210 Z" fill="#2563eb" stroke="#1a1a1a" stroke-width="2.5" />
                  <rect x="4" y="130" width="44" height="58" rx="4" fill="#ffd84d" stroke="#1a1a1a" stroke-width="2.5" />
                </g>
              </svg>
            </div>

            <div class="participation-float">
              <span class="participation-label">Participación del grupo</span>
              <div class="participation-bar">
                <span class="seg seg-orange"></span>
                <span class="seg seg-blue"></span>
                <span class="seg seg-yellow"></span>
                <span class="seg seg-green"></span>
              </div>
            </div>
          </div>
        </section>

        <section id="como-funciona" class="features-section">
          <div class="features-header">
            <h2>¿Cómo funciona GrupLab?</h2>
            <p>Todo el ciclo del trabajo práctico en un solo lugar, sin planillas ni chats perdidos.</p>
          </div>
          <div class="features-grid">
            <article class="feature-card">
              <span class="feature-num num-orange">1</span>
              <h3>Creá o unite a un aula</h3>
              <p>
                Los docentes crean aulas con código de invitación de 6 caracteres y supervisan todos
                los equipos desde un dashboard consolidado.
              </p>
            </article>
            <article class="feature-card">
              <span class="feature-num num-blue">2</span>
              <h3>Organizá el tablero Kanban</h3>
              <p>
                Planificá tareas con peso de esfuerzo, fechas límite, adjuntos seguros en S3 y
                revisión obligatoria entre compañeros antes de cerrar.
              </p>
            </article>
            <article class="feature-card">
              <span class="feature-num num-yellow">3</span>
              <h3>Medí la participación real</h3>
              <p>
                Calculamos el aporte individual combinando esfuerzo completado, puntualidad,
                calidad, colaboración y co-evaluación entre pares.
              </p>
            </article>
          </div>
        </section>

        <footer class="app-footer">
          <p>GrupLab · Gestión de trabajos grupales</p>
        </footer>

        @if (mostrarAuthModal()) {
          <div class="auth-backdrop" (click)="cerrarAuth()">
            <div class="auth-modal" (click)="$event.stopPropagation()">
              <div class="auth-modal-header">
                <div class="landing-brand">
                  <span class="logo-circle" aria-hidden="true">G</span>
                  <span class="logo-text">Grup<span class="logo-accent">Lab</span></span>
                </div>
                <button
                  class="auth-close"
                  type="button"
                  (click)="cerrarAuth()"
                  aria-label="Cerrar ventana de acceso"
                >
                  ✕
                </button>
              </div>
              <amplify-authenticator [initialState]="authInitialState()"></amplify-authenticator>
            </div>
          </div>
        }
      </div>
    }
  `,
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
      }

      .session-loader {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.75rem;
        font-weight: 700;
        color: var(--text-main);
        background: var(--bg-cream);
      }

      /* ===== Authenticated Navbar ===== */
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

      .logo-circle {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 2.25rem;
        height: 2.25rem;
        background-color: var(--orange);
        color: #ffffff;
        font-size: 1.1rem;
        font-weight: 800;
        border: 1.5px solid var(--border-dark);
        border-radius: 50%;
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

      /* ===== Landing Page (Unauthenticated) ===== */
      .landing-shell {
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        background-color: var(--bg-cream);
      }

      .landing-nav {
        width: 100%;
        max-width: 1180px;
        margin: 0 auto;
        padding: 1.25rem 2.5rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
      }

      .landing-brand {
        display: inline-flex;
        align-items: center;
        gap: 0.6rem;
      }

      .landing-nav-actions {
        display: flex;
        align-items: center;
        gap: 1rem;
      }

      .btn-ghost {
        background: transparent;
        border: 0;
        box-shadow: none;
        padding: 0.5rem 0.75rem;
        font-size: 0.95rem;
        font-weight: 700;
        color: var(--text-main);
        cursor: pointer;

        &:hover {
          color: var(--orange);
        }
      }

      .btn-cta-sm {
        background: var(--orange);
        color: #ffffff;
        border: 1.5px solid var(--border-dark);
        border-radius: 999px;
        padding: 0.55rem 1.25rem;
        font-size: 0.92rem;
        font-weight: 700;
        box-shadow: var(--shadow-sm);
        cursor: pointer;
        transition: transform 0.12s ease, box-shadow 0.12s ease, background 0.12s ease;

        &:hover {
          background: var(--orange-hover);
          transform: translate(-1px, -1px);
          box-shadow: var(--shadow-md);
        }
      }

      .hero {
        width: 100%;
        max-width: 1180px;
        margin: 0 auto;
        padding: 2.5rem 2.5rem 4rem;
        display: grid;
        grid-template-columns: 1.05fr 0.95fr;
        align-items: center;
        gap: 3rem;
      }

      .hero-badge {
        display: inline-block;
        background: #ffd84d;
        color: var(--text-main);
        font-size: 0.78rem;
        font-weight: 800;
        letter-spacing: 0.04em;
        padding: 0.38rem 0.95rem;
        border-radius: 999px;
        border: 1.5px solid var(--border-dark);
        box-shadow: var(--shadow-xs);
        margin-bottom: 1.25rem;
      }

      .hero-title {
        font-size: clamp(2.5rem, 4.4vw, 3.85rem);
        font-weight: 800;
        line-height: 1.06;
        letter-spacing: -0.035em;
        margin: 0 0 1.25rem;
        color: var(--text-main);
      }

      .hl-underline {
        position: relative;
        display: inline-block;
        z-index: 1;
      }

      .hl-underline::after {
        content: '';
        position: absolute;
        left: -2px;
        right: -2px;
        bottom: 4px;
        height: 12px;
        background: rgba(255, 90, 31, 0.55);
        z-index: -1;
        border-radius: 3px;
      }

      .hl-blue {
        color: var(--blue);
      }

      .hero-subtitle {
        font-size: 1.08rem;
        line-height: 1.6;
        color: #4b5563;
        max-width: 520px;
        margin: 0 0 2rem;
      }

      .hero-actions {
        display: flex;
        align-items: center;
        gap: 1rem;
        flex-wrap: wrap;
      }

      .btn-cta-lg {
        background: var(--orange);
        color: #ffffff;
        border: 1.5px solid var(--border-dark);
        border-radius: 999px;
        padding: 0.85rem 1.7rem;
        font-size: 1rem;
        font-weight: 700;
        box-shadow: var(--shadow-sm);
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        transition: transform 0.12s ease, box-shadow 0.12s ease, background 0.12s ease;

        &:hover {
          background: var(--orange-hover);
          transform: translate(-1px, -1px);
          box-shadow: var(--shadow-md);
        }
      }

      .btn-secondary-lg {
        background: var(--bg-white);
        color: var(--text-main);
        border: 1.5px solid var(--border-dark);
        border-radius: 999px;
        padding: 0.85rem 1.6rem;
        font-size: 1rem;
        font-weight: 700;
        box-shadow: var(--shadow-sm);
        cursor: pointer;
        transition: transform 0.12s ease, box-shadow 0.12s ease, background 0.12s ease;

        &:hover {
          background: var(--bg-pill);
          transform: translate(-1px, -1px);
          box-shadow: var(--shadow-md);
        }
      }

      .hero-visual {
        position: relative;
        padding-bottom: 1.75rem;
      }

      .illustration-frame {
        background: #fffdf8;
        border: 2px solid var(--border-dark);
        border-radius: 22px;
        overflow: hidden;
        box-shadow: var(--shadow-lg);
      }

      .hero-svg {
        display: block;
        width: 100%;
        height: auto;
      }

      .participation-float {
        position: absolute;
        left: -18px;
        bottom: 0;
        background: var(--bg-white);
        border: 1.5px solid var(--border-dark);
        border-radius: 16px;
        padding: 0.85rem 1.15rem;
        box-shadow: var(--shadow-md);
        min-width: 245px;
      }

      .participation-label {
        display: block;
        font-size: 0.78rem;
        font-weight: 700;
        color: var(--text-main);
        margin-bottom: 0.45rem;
      }

      .participation-bar {
        display: flex;
        height: 11px;
        border-radius: 999px;
        overflow: hidden;
        border: 1.5px solid var(--border-dark);
      }

      .seg {
        display: block;
        height: 100%;
      }
      .seg-orange { width: 34%; background: var(--orange); }
      .seg-blue { width: 28%; background: var(--blue); }
      .seg-yellow { width: 22%; background: #ffd84d; }
      .seg-green { width: 16%; background: #10b981; }

      /* ===== Features Section ===== */
      .features-section {
        width: 100%;
        max-width: 1180px;
        margin: 0 auto 3.5rem;
        padding: 1rem 2.5rem 0;
      }

      .features-header {
        margin-bottom: 1.75rem;
      }

      .features-header h2 {
        font-size: 1.75rem;
        font-weight: 800;
        margin: 0 0 0.35rem;
      }

      .features-header p {
        margin: 0;
        color: var(--text-muted);
        font-size: 1rem;
      }

      .features-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 1.25rem;
      }

      .feature-card {
        background: var(--bg-white);
        border: 1.5px solid var(--border-dark);
        border-radius: 18px;
        padding: 1.35rem 1.4rem;
        box-shadow: var(--shadow-sm);
      }

      .feature-num {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 2rem;
        height: 2rem;
        border-radius: 50%;
        border: 1.5px solid var(--border-dark);
        font-weight: 800;
        font-size: 0.9rem;
        margin-bottom: 0.85rem;
        box-shadow: var(--shadow-xs);
      }

      .num-orange { background: var(--orange); color: #ffffff; }
      .num-blue { background: var(--blue); color: #ffffff; }
      .num-yellow { background: #ffd84d; color: var(--text-main); }

      .feature-card h3 {
        margin: 0 0 0.45rem;
        font-size: 1.08rem;
        font-weight: 800;
      }

      .feature-card p {
        margin: 0;
        font-size: 0.92rem;
        color: #4b5563;
        line-height: 1.5;
      }

      /* ===== Auth Modal ===== */
      .auth-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(26, 26, 26, 0.5);
        backdrop-filter: blur(3px);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1rem;
        z-index: 1000;
      }

      .auth-modal {
        background: var(--bg-cream);
        border: 2px solid var(--border-dark);
        border-radius: 20px;
        box-shadow: var(--shadow-lg);
        width: 100%;
        max-width: 480px;
        max-height: 92vh;
        overflow-y: auto;
        padding: 1.25rem 1.5rem 1.5rem;
      }

      .auth-modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 1rem;
      }

      .auth-close {
        width: 2.1rem;
        height: 2.1rem;
        border-radius: 50%;
        border: 1.5px solid var(--border-dark);
        background: var(--bg-white);
        color: var(--text-main);
        font-weight: 800;
        cursor: pointer;
        box-shadow: var(--shadow-xs);

        &:hover {
          background: var(--danger-50);
          color: var(--danger-600);
        }
      }

      @media (max-width: 920px) {
        .hero {
          grid-template-columns: 1fr;
          padding: 1.5rem 1.5rem 3rem;
          gap: 2.25rem;
        }

        .participation-float {
          left: 12px;
        }

        .features-grid {
          grid-template-columns: 1fr;
        }
      }

      @media (max-width: 760px) {
        .navbar,
        .landing-nav,
        .features-section {
          padding-left: 1rem;
          padding-right: 1rem;
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
  verificandoSesion = signal(true);
  autenticado = signal(false);
  mostrarAuthModal = signal(false);
  authInitialState = signal<'signIn' | 'signUp'>('signIn');

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

  async ngOnInit() {
    this.hubCancel = Hub.listen('auth', ({ payload }) => {
      if (payload.event === 'signedIn' || payload.event === 'signedOut') {
        this.authService.clearCache();
        if (payload.event === 'signedIn') {
          this.autenticado.set(true);
          this.mostrarAuthModal.set(false);
          this.cargarEmail();
        } else {
          this.autenticado.set(false);
          this.userEmail.set(null);
          this.router.navigate(['/mis-aulas']);
        }
      }
    });

    const user = await this.authService.loadUser();
    if (user?.userId) {
      this.autenticado.set(true);
      if (user.email) this.userEmail.set(user.email);
    } else {
      this.autenticado.set(false);
    }
    this.verificandoSesion.set(false);
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

  abrirAuth(mode: 'signIn' | 'signUp') {
    this.authInitialState.set(mode);
    this.mostrarAuthModal.set(true);
  }

  cerrarAuth() {
    this.mostrarAuthModal.set(false);
  }

  scrollAComoFunciona() {
    document.getElementById('como-funciona')?.scrollIntoView({ behavior: 'smooth' });
  }

  irInicio() {
    this.router.navigate(['/mis-aulas']);
  }

  async cerrarSesion() {
    this.authService.clearCache();
    this.userEmail.set(null);
    this.autenticado.set(false);
    await this.authService.logout();
    this.router.navigate(['/mis-aulas']);
  }
}
