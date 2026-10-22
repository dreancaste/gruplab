import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MateriaService } from '../../services/materia';
import { AuthService } from '../../services/auth';
import type { Schema } from '../../../../amplify/data/resource';

type Materia = Schema['Materia']['type'];
type Grupo = Schema['Grupo']['type'];

@Component({
  selector: 'app-aula-detalle',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './aula-detalle.html',
  styleUrl: './aula-detalle.scss',
})
export class AulaDetalle implements OnInit {
  materia = signal<Materia | null>(null);
  grupos = signal<Grupo[]>([]);
  miGrupo = signal<Grupo | null>(null);
  userId = signal<string | null>(null);
  rol = signal<'admin' | 'profesor' | 'alumno' | null>(null);
  cargando = signal(true);
  error = signal<string | null>(null);

  // Solicitudes de acceso por grupoId -> lista de userIds solicitantes
  solicitudesPorGrupo = signal<Record<string, string[]>>({});
  enviandoSolicitudGrupoId = signal<string | null>(null);

  // Modal crear/editar grupo
  mostrarModalGrupo = signal(false);
  modoEdicion = signal(false);
  grupoEditandoId = signal<string | null>(null);
  nombreGrupo = '';
  integrantesSeleccionados = signal<string[]>([]);

  // Modal confirmar eliminar
  mostrarConfirmarEliminar = signal(false);
  grupoAEliminar = signal<Grupo | null>(null);

  // Modal crear grupo (alumno)
  mostrarCrearGrupoAlumno = signal(false);

  mostrarConfirmarEliminarAula = signal(false);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private materiaService: MateriaService,
    private auth: AuthService,
  ) {}

  async ngOnInit() {
    try {
      const id = this.route.snapshot.paramMap.get('id');
      if (!id) throw new Error('ID de aula no válido');

      const uid = await this.auth.getUserId();
      this.userId.set(uid);

      const materia = await this.materiaService.obtenerMateria(id);
      if (!materia) throw new Error('Aula no encontrada');
      this.materia.set(materia);

      const rol = this.materiaService.obtenerRol(materia, uid);
      this.rol.set(rol);
      if (!rol) throw new Error('No tenés acceso a esta aula');

      await this.recargarGrupos();
    } catch (e: any) {
      this.error.set(e.message ?? 'Error al cargar el aula');
    } finally {
      this.cargando.set(false);
    }
  }

  private async recargarGrupos() {
    const materia = this.materia();
    const uid = this.userId();
    if (!materia || !uid) return;

    const grupos = await this.materiaService.listarGruposDeMateria(materia.id);
    this.grupos.set(grupos);

    if (this.rol() === 'alumno') {
      const propio = grupos.find((g) => (g.integrantes ?? []).includes(uid)) ?? null;
      this.miGrupo.set(propio);
    }

    // Cargar solicitudes pendientes de cada grupo
    const mapa: Record<string, string[]> = {};
    await Promise.all(
      grupos.map(async (g) => {
        try {
          mapa[g.id] = await this.materiaService.listarSolicitudesPendientesDeGrupo(
            g.id,
            g.integrantes ?? [],
          );
        } catch {
          mapa[g.id] = [];
        }
      }),
    );
    this.solicitudesPorGrupo.set(mapa);
  }

  // ==== Helpers ====

  get esDocente(): boolean {
    const r = this.rol();
    return r === 'admin' || r === 'profesor';
  }

  get alumnosDisponibles(): string[] {
    return (this.materia()?.alumnos ?? []).filter((id): id is string => !!id);
  }

  get esAdmin(): boolean {
    return this.rol() === 'admin';
  }

  get otrosGruposDelSalon(): Grupo[] {
    const miId = this.miGrupo()?.id;
    return this.grupos().filter((g) => g.id !== miId);
  }

  yaSolicitoAcceso(grupoId: string): boolean {
    const uid = this.userId();
    if (!uid) return false;
    return (this.solicitudesPorGrupo()[grupoId] ?? []).includes(uid);
  }

  solicitudesDeGrupo(grupoId: string): string[] {
    return this.solicitudesPorGrupo()[grupoId] ?? [];
  }

  esAdminDeMiGrupo(): boolean {
    const g = this.miGrupo();
    const uid = this.userId();
    return !!g && !!uid && g.adminId === uid;
  }

  async solicitarAcceso(grupo: Grupo, event?: Event) {
    event?.stopPropagation();
    const uid = this.userId();
    if (!uid || this.miGrupo()) return;

    this.enviandoSolicitudGrupoId.set(grupo.id);
    this.error.set(null);
    try {
      await this.materiaService.solicitarAccesoGrupo(grupo.id, uid);
      await this.recargarGrupos();
    } catch (e: any) {
      this.error.set(e.message ?? 'No se pudo enviar la solicitud');
    } finally {
      this.enviandoSolicitudGrupoId.set(null);
    }
  }

  async responderSolicitud(grupo: Grupo, solicitanteId: string, aprobar: boolean, event?: Event) {
    event?.stopPropagation();
    const uid = this.userId();
    const materia = this.materia();
    if (!uid || !materia) return;

    this.error.set(null);
    try {
      if (aprobar) {
        const ocupados = await this.materiaService.alumnosEnOtroGrupo(
          materia.id,
          [solicitanteId],
          grupo.id,
        );
        if (ocupados.length > 0) {
          this.error.set('Este alumno ya forma parte de otro grupo en esta aula.');
          return;
        }
      }
      await this.materiaService.resolverSolicitudAcceso(grupo.id, solicitanteId, aprobar, uid);
      await this.recargarGrupos();
    } catch (e: any) {
      this.error.set(e.message ?? 'Error al procesar la solicitud');
    }
  }

  volver() {
    this.router.navigate(['/mis-aulas']);
  }

  // ==== Crear grupo (alumno) ====

  abrirCrearGrupoAlumno() {
    this.mostrarCrearGrupoAlumno.set(true);
    this.nombreGrupo = '';
    this.error.set(null);
  }

  cerrarCrearGrupoAlumno() {
    this.mostrarCrearGrupoAlumno.set(false);
  }

  async crearGrupoAlumno() {
    const uid = this.userId();
    const materia = this.materia();
    if (!uid || !materia || !this.nombreGrupo.trim()) return;

    try {
      const nuevo = await this.materiaService.crearGrupo(materia.id, this.nombreGrupo.trim(), uid);
      this.miGrupo.set(nuevo);
      await this.recargarGrupos();
      this.cerrarCrearGrupoAlumno();
    } catch (e: any) {
      this.error.set(e.message ?? 'Error al crear el grupo');
    }
  }

  // ==== Crear/editar grupo (profesor) ====

  abrirCrearGrupo() {
    this.modoEdicion.set(false);
    this.grupoEditandoId.set(null);
    this.nombreGrupo = '';
    this.integrantesSeleccionados.set([]);
    this.error.set(null);
    this.mostrarModalGrupo.set(true);
  }

  abrirEditarGrupo(g: Grupo, event: Event) {
    event.stopPropagation();
    this.modoEdicion.set(true);
    this.grupoEditandoId.set(g.id);
    this.nombreGrupo = g.nombre;
    const alumnos = this.materia()?.alumnos ?? [];
    this.integrantesSeleccionados.set(
      (g.integrantes ?? []).filter((uid): uid is string => !!uid && alumnos.includes(uid)),
    );
    this.error.set(null);
    this.mostrarModalGrupo.set(true);
  }

  cerrarModalGrupo() {
    this.mostrarModalGrupo.set(false);
    this.nombreGrupo = '';
    this.integrantesSeleccionados.set([]);
    this.grupoEditandoId.set(null);
    this.error.set(null);
  }

  toggleIntegrante(userId: string) {
    const actuales = this.integrantesSeleccionados();
    if (actuales.includes(userId)) {
      this.integrantesSeleccionados.set(actuales.filter((u) => u !== userId));
    } else {
      this.integrantesSeleccionados.set([...actuales, userId]);
    }
  }

  estaSeleccionado(userId: string): boolean {
    return this.integrantesSeleccionados().includes(userId);
  }

  async guardarGrupo() {
    const materia = this.materia();
    const uid = this.userId();
    if (!materia || !uid || !this.nombreGrupo.trim()) return;

    try {
      const integrantes = this.integrantesSeleccionados();
      const grupoIdExcluir = this.modoEdicion() ? this.grupoEditandoId() : undefined;

      const ocupados = await this.materiaService.alumnosEnOtroGrupo(
        materia.id,
        integrantes,
        grupoIdExcluir ?? undefined,
      );
      if (ocupados.length > 0) {
        this.error.set(`Estos alumnos ya están en otro grupo: ${ocupados.join(', ')}`);
        return;
      }

      if (this.modoEdicion() && this.grupoEditandoId()) {
        await this.materiaService.actualizarGrupo(this.grupoEditandoId()!, {
          nombre: this.nombreGrupo.trim(),
          integrantes,
        });
      } else {
        const nuevo = await this.materiaService.crearGrupo(
          materia.id,
          this.nombreGrupo.trim(),
          uid,
        );
        if (integrantes.length > 0) {
          await this.materiaService.actualizarGrupo(nuevo.id, { integrantes });
        }
      }

      await this.recargarGrupos();
      this.cerrarModalGrupo();
    } catch (e: any) {
      this.error.set(e.message ?? 'Error al guardar el grupo');
    }
  }

  // ==== Eliminar grupo ====

  confirmarEliminar(g: Grupo, event: Event) {
    event.stopPropagation();
    this.grupoAEliminar.set(g);
    this.mostrarConfirmarEliminar.set(true);
  }

  cancelarEliminar() {
    this.grupoAEliminar.set(null);
    this.mostrarConfirmarEliminar.set(false);
  }

  async eliminarGrupo() {
    const g = this.grupoAEliminar();
    if (!g) return;
    try {
      await this.materiaService.eliminarGrupo(g.id);
      await this.recargarGrupos();
      this.cancelarEliminar();
    } catch (e: any) {
      this.error.set(e.message ?? 'Error al eliminar el grupo');
    }
  }

  // ==== Ver grupo ====

  abrirGrupo(grupoId: string) {
    if (!this.esDocente && this.miGrupo()?.id !== grupoId) {
      return;
    }
    this.router.navigate(['/grupo', grupoId]);
  }

  // ==== Eliminar aula ====

  abrirConfirmarEliminarAula() {
    this.mostrarConfirmarEliminarAula.set(true);
  }

  cancelarEliminarAula() {
    this.mostrarConfirmarEliminarAula.set(false);
  }

  async eliminarAula() {
    const m = this.materia();
    if (!m) return;
    try {
      await this.materiaService.eliminarMateria(m.id);
      this.router.navigate(['/mis-aulas']);
    } catch (e: any) {
      this.error.set(e.message ?? 'Error al eliminar el aula');
    }
  }
}
