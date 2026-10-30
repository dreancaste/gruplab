import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MateriaService } from '../../services/materia';
import { AuthService } from '../../services/auth';
import type { Schema } from '../../../../amplify/data/resource';

type Materia = Schema['Materia']['type'];
type Grupo = Schema['Grupo']['type'];

@Component({
  selector: 'app-mis-aulas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './mis-aulas.html',
  styleUrl: './mis-aulas.scss',
})
export class MisAulas implements OnInit {
  misMaterias = signal<Materia[]>([]);
  misTableros = signal<Grupo[]>([]);

  // Modal "Crear tablero"
  mostrarCrearTablero = signal(false);
  nombreTablero = '';

  // Modal "Unirme a tablero con código"
  mostrarUnirseTablero = signal(false);
  codigoTablero = '';
  userId = signal<string | null>(null);
  cargando = signal(true);
  guardando = signal(false);
  error = signal<string | null>(null);

  // Modal "Crear aula"
  mostrarCrear = signal(false);
  nuevaNombre = '';
  nuevaDescripcion = '';

  // Modal "Unirme con código"
  mostrarUnirse = signal(false);
  codigoIngresado = '';

  constructor(
    private materiaService: MateriaService,
    private auth: AuthService,
    private router: Router,
  ) {}

  async ngOnInit() {
    try {
      const uid = await this.auth.getUserId();
      this.userId.set(uid);
      this.auth.getEmail?.().then((email) => {
        if (email) this.materiaService.sincronizarPerfilUsuario?.(uid, email);
      }).catch(() => {});
      const materias = await this.materiaService.listarMisMaterias(uid);
      this.misMaterias.set(materias);
      const tableros = await this.materiaService.listarMisTableros(uid);
      this.misTableros.set(tableros);
    } catch (e: any) {
      this.error.set(e.message ?? 'Error al cargar materias');
    } finally {
      this.cargando.set(false);
    }
  }

  // ==== Aulas filtradas por rol ====

  get materiasComoDocente(): Materia[] {
    const uid = this.userId();
    if (!uid) return [];
    return this.misMaterias().filter(
      (m) => m.creadorId === uid || m.admins?.includes(uid) || m.profesores?.includes(uid),
    );
  }

  get materiasComoAlumno(): Materia[] {
    const uid = this.userId();
    if (!uid) return [];
    return this.misMaterias().filter((m) => m.alumnos?.includes(uid));
  }

  // ==== Acciones ====

  async crearAula() {
    const uid = this.userId();
    if (!uid || this.guardando()) return;
    if (!this.nuevaNombre.trim()) {
      this.error.set('Ingresá un nombre para el aula.');
      return;
    }

    this.error.set(null);
    this.guardando.set(true);
    try {
      const nueva = await this.materiaService.crearMateria(
        this.nuevaNombre.trim(),
        this.nuevaDescripcion.trim(),
        uid,
      );
      this.misMaterias.update((ms) => [...ms, nueva]);
      this.cerrarCrear();
    } catch (e: any) {
      this.error.set(e.message ?? 'Error al crear el aula');
    } finally {
      this.guardando.set(false);
    }
  }

  async unirseConCodigo() {
    const uid = this.userId();
    if (!uid || this.guardando()) return;
    if (!this.codigoIngresado.trim()) {
      this.error.set('Ingresá el código de invitación.');
      return;
    }

    this.error.set(null);
    this.guardando.set(true);
    try {
      const materia = await this.materiaService.unirseConCodigo(this.codigoIngresado.trim(), uid);
      this.misMaterias.update((ms) => [...ms, materia]);
      this.cerrarUnirse();
    } catch (e: any) {
      this.error.set(e.message ?? 'Error al unirse al aula');
    } finally {
      this.guardando.set(false);
    }
  }

  abrirAula(materiaId: string) {
    this.router.navigate(['/aula', materiaId]);
  }

  // ==== UI modales ====

  abrirCrear() {
    this.mostrarCrear.set(true);
    this.error.set(null);
  }
  cerrarCrear() {
    this.mostrarCrear.set(false);
    this.guardando.set(false);
    this.nuevaNombre = '';
    this.nuevaDescripcion = '';
    this.error.set(null);
  }

  abrirUnirse() {
    this.mostrarUnirse.set(true);
    this.error.set(null);
  }
  cerrarUnirse() {
    this.mostrarUnirse.set(false);
    this.guardando.set(false);
    this.codigoIngresado = '';
    this.error.set(null);
  }
    // ==== Tableros independientes ====

  abrirCrearTablero() {
    this.mostrarCrearTablero.set(true);
    this.nombreTablero = '';
    this.error.set(null);
  }

  cerrarCrearTablero() {
    this.mostrarCrearTablero.set(false);
    this.guardando.set(false);
    this.nombreTablero = '';
    this.error.set(null);
  }

  async crearTablero() {
    const uid = this.userId();
    if (!uid || this.guardando()) return;
    if (!this.nombreTablero.trim()) {
      this.error.set('Ingresá un nombre para el tablero.');
      return;
    }

    this.error.set(null);
    this.guardando.set(true);
    try {
      const nuevo = await this.materiaService.crearTableroIndependiente(
        this.nombreTablero.trim(),
        uid
      );
      this.misTableros.update((ts) => [...ts, nuevo]);
      this.cerrarCrearTablero();
    } catch (e: any) {
      this.error.set(e.message ?? 'Error al crear el tablero');
    } finally {
      this.guardando.set(false);
    }
  }

  abrirUnirseTablero() {
    this.mostrarUnirseTablero.set(true);
    this.codigoTablero = '';
    this.error.set(null);
  }

  cerrarUnirseTablero() {
    this.mostrarUnirseTablero.set(false);
    this.guardando.set(false);
    this.codigoTablero = '';
    this.error.set(null);
  }

  async unirseATablero() {
    const uid = this.userId();
    if (!uid || this.guardando()) return;
    if (!this.codigoTablero.trim()) {
      this.error.set('Ingresá el código del tablero.');
      return;
    }

    this.error.set(null);
    this.guardando.set(true);
    try {
      const tablero = await this.materiaService.unirseATableroConCodigo(
        this.codigoTablero.trim(),
        uid
      );
      this.misTableros.update((ts) => [...ts, tablero]);
      this.cerrarUnirseTablero();
    } catch (e: any) {
      this.error.set(e.message ?? 'Error al unirse al tablero');
    } finally {
      this.guardando.set(false);
    }
  }

  abrirTablero(tableroId: string) {
    this.router.navigate(['/grupo', tableroId]);
  }
}
