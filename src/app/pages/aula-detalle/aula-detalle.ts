import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MateriaService } from '../../services/materia';
import { AuthService } from '../../services/auth';
import { DashboardComponent } from '../../components/dashboard/dashboard';
import type { Schema } from '../../../../amplify/data/resource';

type Materia = Schema['Materia']['type'];
type Grupo = Schema['Grupo']['type'];
type Card = Schema['Card']['type'];

@Component({
  selector: 'app-aula-detalle',
  standalone: true,
  imports: [CommonModule, FormsModule, DashboardComponent],
  templateUrl: './aula-detalle.html',
  styleUrl: './aula-detalle.scss',
})
export class AulaDetalle implements OnInit {
  materia = signal<Materia | null>(null);
  grupos = signal<Grupo[]>([]);
  cardsPorGrupo = signal<Record<string, Card[]>>({});
  usuariosMap = signal<Record<string, string>>({
    'b34c1aaa-5011-704e-e9bf-e6f62c2ee306': 'luciano.barbosa30@gmail.com',
    'b3dc0ada-20e1-70bf-133e-5ce5f6c2d36c': 'luciano_l17@hotmail.com',
    'd3bcaaea-8091-7090-e940-37cf06abf4c1': 'leandroserapio95@gmail.com',
    '833c4aba-8081-70ca-27e3-43a0ab5ce9c4': 'iglesiasngonzalo@gmail.com',
    'b3dc9a8a-50c1-70de-fe49-0de5e5ac28a3': 'leandroserapio95+alumno2@gmail.com',
    'a30c3a8a-b0f1-708d-d91f-36ae2a810967': 'leandroserapio95+alumno1@gmail.com',
    '34181498-4001-7030-bfe0-92e87e7858b3': 'luciano_l17@hotmail.com',
  });
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
  guardandoGrupo = signal(false);
  nombreGrupo = '';
  integrantesSeleccionados = signal<string[]>([]);

  // Modal participantes y roles (promover alumnos a profesor)
  mostrarModalParticipantes = signal(false);
  nuevoAlumnoEmail = '';

  // Modal confirmar eliminar
  mostrarConfirmarEliminar = signal(false);
  grupoAEliminar = signal<Grupo | null>(null);
  alumnoAQuitarDelAula = signal<string | null>(null);

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

      this.auth.getEmail?.().then((email) => {
        if (email) {
          this.usuariosMap.update((m) => ({ ...m, [uid]: email }));
          this.materiaService.sincronizarPerfilUsuario?.(uid, email);
        }
      }).catch(() => {});

      const materia = await this.materiaService.obtenerMateria(id);
      if (!materia) throw new Error('Aula no encontrada');
      this.materia.set(materia);

      const rol = this.materiaService.obtenerRol(materia, uid);
      this.rol.set(rol);
      if (!rol) throw new Error('No tenés acceso a esta aula');

      if (this.materiaService.obtenerMapaUsuarios) {
        const mapa = await this.materiaService.obtenerMapaUsuarios();
        this.usuariosMap.update((actual) => ({ ...actual, ...mapa }));
      }

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

    const docentes = new Set([...this.adminsAula, ...this.profesoresAula]);
    const rawGrupos = await this.materiaService.listarGruposDeMateria(materia.id);
    const grupos = rawGrupos.map((g) => {
      const limpios = (g.integrantes ?? []).filter(
        (id): id is string => !!id && !docentes.has(id),
      );
      if (
        this.esDocente &&
        limpios.length !== (g.integrantes ?? []).filter(Boolean).length &&
        this.materiaService.actualizarGrupo
      ) {
        this.materiaService.actualizarGrupo(g.id, { integrantes: limpios }).catch(() => {});
      }
      return { ...g, integrantes: limpios };
    });
    this.grupos.set(grupos);

    if (this.rol() === 'alumno') {
      const propio = grupos.find((g) => (g.integrantes ?? []).includes(uid)) ?? null;
      this.miGrupo.set(propio);
    }

    const mapaSolicitudes: Record<string, string[]> = {};
    const mapaCards: Record<string, Card[]> = {};

    await Promise.all(
      grupos.map(async (g) => {
        try {
          if (this.materiaService.listarSolicitudesPendientesDeGrupo) {
            mapaSolicitudes[g.id] = await this.materiaService.listarSolicitudesPendientesDeGrupo(
              g.id,
              g.integrantes ?? [],
            );
          } else {
            mapaSolicitudes[g.id] = [];
          }
        } catch {
          mapaSolicitudes[g.id] = [];
        }

        if (this.esDocente && this.materiaService.listarCardsDeGrupo) {
          try {
            mapaCards[g.id] = await this.materiaService.listarCardsDeGrupo(g.id);
          } catch {
            mapaCards[g.id] = [];
          }
        }
      }),
    );

    this.solicitudesPorGrupo.set(mapaSolicitudes);
    this.cardsPorGrupo.set(mapaCards);
  }

  // ==== Helpers ====

  nombreUsuario(id: string | null | undefined): string {
    if (!id) return '';
    return this.usuariosMap()[id] ?? `Usuario (${id.slice(0, 6)})`;
  }

  nombresIntegrantesGrupo(g: Grupo): string {
    const lista = (g.integrantes ?? []).filter((i): i is string => !!i);
    if (lista.length === 0) return 'Sin integrantes';
    return lista.map((id) => this.nombreUsuario(id)).join(', ');
  }

  grupoDeAlumno(alumnoId: string): Grupo | null {
    return this.grupos().find((g) => (g.integrantes ?? []).includes(alumnoId)) ?? null;
  }

  get esDocente(): boolean {
    const r = this.rol();
    return r === 'admin' || r === 'profesor';
  }

  get adminsAula(): string[] {
    const m = this.materia();
    if (!m) return [];
    const set = new Set<string>();
    if (m.creadorId) set.add(m.creadorId);
    for (const id of m.admins ?? []) {
      if (id) set.add(id);
    }
    return Array.from(set);
  }

  get profesoresAula(): string[] {
    const admins = new Set(this.adminsAula);
    return (this.materia()?.profesores ?? []).filter(
      (id): id is string => !!id && !admins.has(id),
    );
  }

  get alumnosDisponibles(): string[] {
    const docentes = new Set([...this.adminsAula, ...this.profesoresAula]);
    const set = new Set<string>();
    for (const id of this.materia()?.alumnos ?? []) {
      if (id && !docentes.has(id)) set.add(id);
    }
    for (const g of this.grupos()) {
      for (const id of g.integrantes ?? []) {
        if (id && !docentes.has(id)) set.add(id);
      }
    }
    return Array.from(set);
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

  // ==== Gestión de participantes / Promover alumnos ====

  abrirParticipantes() {
    this.mostrarModalParticipantes.set(true);
    this.error.set(null);
  }

  cerrarParticipantes() {
    this.mostrarModalParticipantes.set(false);
  }

  async promoverAProfesor(alumnoId: string) {
    const m = this.materia();
    if (!m) return;
    try {
      const actualizada = await this.materiaService.promoverAlumnoAProfesor(m.id, alumnoId);
      this.materia.set(actualizada);
    } catch (e: any) {
      this.error.set(e.message ?? 'No se pudo promover al alumno');
    }
  }

  async degradarAAlumno(profesorId: string) {
    const m = this.materia();
    if (!m) return;
    try {
      const actualizada = await this.materiaService.degradarProfesorAAlumno(m.id, profesorId);
      this.materia.set(actualizada);
    } catch (e: any) {
      this.error.set(e.message ?? 'No se pudo cambiar el rol');
    }
  }

  quitarAlumnoDelAula(alumnoId: string) {
    this.alumnoAQuitarDelAula.set(alumnoId);
  }

  cancelarQuitarAlumnoDelAula() {
    this.alumnoAQuitarDelAula.set(null);
  }

  async confirmarQuitarAlumnoDelAula() {
    const m = this.materia();
    const alumnoId = this.alumnoAQuitarDelAula();
    if (!m || !alumnoId) return;
    this.alumnoAQuitarDelAula.set(null);
    try {
      const actualizada = await this.materiaService.eliminarAlumnoDeMateria(m.id, alumnoId);
      this.materia.set(actualizada);
      await this.recargarGrupos();
    } catch (e: any) {
      this.error.set(e.message ?? 'No se pudo eliminar al alumno del aula');
    }
  }

  get usuariosSugeridosParaAula(): { id: string; email: string }[] {
    const enAula = new Set([
      ...this.adminsAula,
      ...this.profesoresAula,
      ...this.alumnosDisponibles,
    ]);
    const vistosEmail = new Set<string>();
    const lista: { id: string; email: string }[] = [];
    for (const [id, email] of Object.entries(this.usuariosMap())) {
      if (!enAula.has(id) && !vistosEmail.has(email.toLowerCase())) {
        vistosEmail.add(email.toLowerCase());
        lista.push({ id, email });
      }
    }
    return lista;
  }

  async agregarAlumnoAlAula(identificador?: string) {
    const m = this.materia();
    const valor = (identificador ?? this.nuevoAlumnoEmail).trim();
    if (!m || !valor) return;

    this.error.set(null);
    try {
      const actualizada = await this.materiaService.agregarAlumnoAMateria(m.id, valor);
      this.materia.set(actualizada);
      this.nuevoAlumnoEmail = '';
      await this.recargarGrupos();
    } catch (e: any) {
      this.error.set(e.message ?? 'No se pudo agregar al integrante al aula');
    }
  }

  async asignarAlumnoAGrupoDesdeAula(alumnoId: string, eventOrGrupoId: Event | string) {
    const grupoDestinoId =
      typeof eventOrGrupoId === 'string'
        ? eventOrGrupoId
        : ((eventOrGrupoId.target as HTMLSelectElement)?.value ?? '');
    const m = this.materia();
    if (!m) return;

    this.error.set(null);
    try {
      const actual = this.grupoDeAlumno(alumnoId);
      if (actual && actual.id !== grupoDestinoId) {
        await this.materiaService.eliminarIntegranteDeGrupo(actual.id, alumnoId);
      }
      if (grupoDestinoId) {
        await this.materiaService.agregarIntegranteAGrupo(grupoDestinoId, alumnoId);
      }
      await this.recargarGrupos();
    } catch (e: any) {
      this.error.set(e.message ?? 'No se pudo actualizar el grupo del alumno');
    }
  }

  async quitarIntegranteDeGrupoDirecto(grupo: Grupo, alumnoId: string, event?: Event) {
    event?.stopPropagation();
    this.error.set(null);
    try {
      await this.materiaService.eliminarIntegranteDeGrupo(grupo.id, alumnoId);
      await this.recargarGrupos();
    } catch (e: any) {
      this.error.set(e.message ?? 'No se pudo quitar al integrante del grupo');
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
    this.guardandoGrupo.set(false);
    this.error.set(null);
  }

  async crearGrupoAlumno() {
    const uid = this.userId();
    const materia = this.materia();
    if (!uid || !materia || this.guardandoGrupo()) return;
    if (!this.nombreGrupo.trim()) {
      this.error.set('Ingresá un nombre para el grupo.');
      return;
    }

    this.error.set(null);
    this.guardandoGrupo.set(true);
    try {
      if (this.materiaService.alumnosEnOtroGrupo) {
        const ocupados = await this.materiaService.alumnosEnOtroGrupo(materia.id, [uid]);
        if (ocupados.length > 0) {
          this.error.set('Ya formás parte de un grupo en esta aula.');
          return;
        }
      }
      const nuevo = await this.materiaService.crearGrupo(materia.id, this.nombreGrupo.trim(), uid);
      this.miGrupo.set(nuevo);
      await this.recargarGrupos();
      this.cerrarCrearGrupoAlumno();
    } catch (e: any) {
      this.error.set(e.message ?? 'Error al crear el grupo');
    } finally {
      this.guardandoGrupo.set(false);
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
    const disponibles = new Set(this.alumnosDisponibles);
    this.integrantesSeleccionados.set(
      (g.integrantes ?? []).filter((uid): uid is string => !!uid && disponibles.has(uid)),
    );
    this.error.set(null);
    this.mostrarModalGrupo.set(true);
  }

  cerrarModalGrupo() {
    this.mostrarModalGrupo.set(false);
    this.guardandoGrupo.set(false);
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
    if (!materia || !uid || this.guardandoGrupo()) return;
    if (!this.nombreGrupo.trim()) {
      this.error.set('Ingresá un nombre para el grupo.');
      return;
    }

    this.error.set(null);
    this.guardandoGrupo.set(true);
    try {
      const integrantes = this.integrantesSeleccionados();
      const grupoIdExcluir = this.modoEdicion() ? this.grupoEditandoId() : undefined;

      const ocupados = await this.materiaService.alumnosEnOtroGrupo(
        materia.id,
        integrantes,
        grupoIdExcluir ?? undefined,
      );
      if (ocupados.length > 0) {
        const nombres = ocupados.map((id) => this.nombreUsuario(id)).join(', ');
        this.error.set(`Estos alumnos ya están en otro grupo: ${nombres}`);
        return;
      }

      if (this.modoEdicion() && this.grupoEditandoId()) {
        const gId = this.grupoEditandoId()!;
        await this.materiaService.actualizarGrupo(gId, {
          nombre: this.nombreGrupo.trim(),
          integrantes,
        });
        this.materiaService
          .registrarLog?.(gId, uid, 'editar_integrantes', 'Grupo', gId)
          ?.catch(() => {});
      } else {
        const nuevo = await this.materiaService.crearGrupo(
          materia.id,
          this.nombreGrupo.trim(),
          uid,
          integrantes,
        );
        if (nuevo?.id) {
          this.materiaService
            .registrarLog?.(nuevo.id, uid, 'crear_grupo', 'Grupo', nuevo.id)
            ?.catch(() => {});
        }
      }

      await this.recargarGrupos();
      this.cerrarModalGrupo();
    } catch (e: any) {
      this.error.set(e.message ?? 'Error al guardar el grupo');
    } finally {
      this.guardandoGrupo.set(false);
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
