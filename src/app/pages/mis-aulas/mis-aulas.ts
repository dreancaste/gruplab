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
    return this.misMaterias().filter((m) => m.admins?.includes(uid) || m.profesores?.includes(uid));
  }

  get materiasComoAlumno(): Materia[] {
    const uid = this.userId();
    if (!uid) return [];
    return this.misMaterias().filter((m) => m.alumnos?.includes(uid));
  }

  // ==== Acciones ====

  async crearAula() {
    const uid = this.userId();
    if (!uid || !this.nuevaNombre.trim()) return;

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
    }
  }

  async unirseConCodigo() {
    const uid = this.userId();
    if (!uid || !this.codigoIngresado.trim()) return;

    try {
      const materia = await this.materiaService.unirseConCodigo(this.codigoIngresado.trim(), uid);
      this.misMaterias.update((ms) => [...ms, materia]);
      this.cerrarUnirse();
    } catch (e: any) {
      this.error.set(e.message ?? 'Error al unirse al aula');
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
    this.nuevaNombre = '';
    this.nuevaDescripcion = '';
  }

  abrirUnirse() {
    this.mostrarUnirse.set(true);
    this.error.set(null);
  }
  cerrarUnirse() {
    this.mostrarUnirse.set(false);
    this.codigoIngresado = '';
  }
    // ==== Tableros independientes ====

  abrirCrearTablero() {
    this.mostrarCrearTablero.set(true);
    this.nombreTablero = '';
    this.error.set(null);
  }

  cerrarCrearTablero() {
    this.mostrarCrearTablero.set(false);
    this.nombreTablero = '';
  }

  async crearTablero() {
    const uid = this.userId();
    if (!uid || !this.nombreTablero.trim()) return;

    try {
      const nuevo = await this.materiaService.crearTableroIndependiente(
        this.nombreTablero.trim(),
        uid
      );
      this.misTableros.update((ts) => [...ts, nuevo]);
      this.cerrarCrearTablero();
    } catch (e: any) {
      this.error.set(e.message ?? 'Error al crear el tablero');
    }
  }

  abrirUnirseTablero() {
    this.mostrarUnirseTablero.set(true);
    this.codigoTablero = '';
    this.error.set(null);
  }

  cerrarUnirseTablero() {
    this.mostrarUnirseTablero.set(false);
    this.codigoTablero = '';
  }

  async unirseATablero() {
    const uid = this.userId();
    if (!uid || !this.codigoTablero.trim()) return;

    try {
      const tablero = await this.materiaService.unirseATableroConCodigo(
        this.codigoTablero.trim(),
        uid
      );
      this.misTableros.update((ts) => [...ts, tablero]);
      this.cerrarUnirseTablero();
    } catch (e: any) {
      this.error.set(e.message ?? 'Error al unirse al tablero');
    }
  }

  abrirTablero(tableroId: string) {
    this.router.navigate(['/grupo', tableroId]);
  }
}
