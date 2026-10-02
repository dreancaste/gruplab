import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  CdkDragDrop,
  DragDropModule,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop';
import { MateriaService } from '../../services/materia';
import { AuthService } from '../../services/auth';
import type { Schema } from '../../../../amplify/data/resource';

type Card = Schema['Card']['type'];
type Grupo = Schema['Grupo']['type'];
type Estado = 'backlog' | 'progreso' | 'revision' | 'hecho';

@Component({
  selector: 'app-grupo-detalle',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule],
  templateUrl: './grupo-detalle.html',
  styleUrl: './grupo-detalle.scss',
})
export class GrupoDetalle implements OnInit {
  grupo = signal<Grupo | null>(null);
  userId = signal<string | null>(null);
  esDocente = signal(false);
  cargando = signal(true);
  error = signal<string | null>(null);

  todasLasCards = signal<Card[]>([]);

  backlog = computed(() =>
    this.ordenar(this.todasLasCards().filter((c) => c.estado === 'backlog'))
  );
  progreso = computed(() =>
    this.ordenar(this.todasLasCards().filter((c) => c.estado === 'progreso'))
  );
  revision = computed(() =>
    this.ordenar(this.todasLasCards().filter((c) => c.estado === 'revision'))
  );
  hecho = computed(() =>
    this.ordenar(this.todasLasCards().filter((c) => c.estado === 'hecho'))
  );

  // Admin del grupo
  esAdminDelGrupo = computed(() => {
    const g = this.grupo();
    const uid = this.userId();
    return !!g && !!uid && g.adminId === uid;
  });

  // Detectar si es tablero independiente
  get esTableroIndependiente(): boolean {
    return !this.grupo()?.materiaId;
  }

  // Modal crear/editar card
  mostrarModalCard = signal(false);
  modoEdicionCard = signal(false);
  cardEditandoId = signal<string | null>(null);
  cardTitulo = '';
  cardDescripcion = '';
  cardEstado: Estado = 'backlog';

  // Modal puntuar (profesor)
  mostrarModalPuntuar = signal(false);
  cardAPuntuar = signal<Card | null>(null);
  puntuacionInput = 0;
  comentarioInput = '';

  // Modal editar nombre del grupo
  mostrarModalNombre = signal(false);
  nuevoNombreGrupo = '';

  // Modal gestionar integrantes
  mostrarModalIntegrantes = signal(false);
  alumnosAgregables = signal<string[]>([]);
  integrantesSeleccionados = signal<string[]>([]);

  // Confirmaciones
  mostrarConfirmarSalir = signal(false);
  mostrarConfirmarEliminarGrupo = signal(false);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private materiaService: MateriaService,
    private auth: AuthService
  ) {}

  async ngOnInit() {
    try {
      const grupoId = this.route.snapshot.paramMap.get('id');
      if (!grupoId) throw new Error('ID de grupo no válido');

      const userId = await this.auth.getUserId();
      this.userId.set(userId);

      const grupo = await this.materiaService.obtenerGrupo(grupoId);
      if (!grupo) throw new Error('Grupo no encontrado');
      this.grupo.set(grupo);

      // Determinar rol
      if (grupo.materiaId) {
        const materia = await this.materiaService.obtenerMateria(grupo.materiaId);
        if (!materia) throw new Error('Materia no encontrada');
        const rol = this.materiaService.obtenerRol(materia, userId);
        this.esDocente.set(rol === 'admin' || rol === 'profesor');
      } else {
        this.esDocente.set(false);
      }

      await this.recargarCards();
    } catch (e: any) {
      this.error.set(e.message ?? 'Error al cargar el grupo');
    } finally {
      this.cargando.set(false);
    }
  }

  private ordenar(cards: Card[]): Card[] {
    return [...cards].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
  }

  private async recargarCards() {
    const g = this.grupo();
    if (!g) return;
    const cards = await this.materiaService.listarCardsDeGrupo(g.id);
    this.todasLasCards.set(cards);
  }

  volver() {
    const g = this.grupo();
    if (g?.materiaId) {
      this.router.navigate(['/aula', g.materiaId]);
    } else {
      this.router.navigate(['/mis-aulas']);
    }
  }

  // ==== Drag & drop ====

  async drop(event: CdkDragDrop<Card[]>, nuevoEstado: Estado) {
    const card = event.previousContainer.data[event.previousIndex];

    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
    }

    try {
      await this.materiaService.actualizarCard(card.id, { estado: nuevoEstado });
      await this.materiaService.registrarLog(
        card.grupoId,
        this.userId()!,
        'mover_card',
        'Card',
        card.id
      );
      await this.recargarCards();
    } catch (e: any) {
      this.error.set(e.message ?? 'Error al mover la card');
      await this.recargarCards();
    }
  }

  // ==== Crear / editar card ====

  abrirCrearCard() {
    this.modoEdicionCard.set(false);
    this.cardEditandoId.set(null);
    this.cardTitulo = '';
    this.cardDescripcion = '';
    this.cardEstado = 'backlog';
    this.mostrarModalCard.set(true);
  }

  abrirEditarCard(card: Card) {
    this.modoEdicionCard.set(true);
    this.cardEditandoId.set(card.id);
    this.cardTitulo = card.titulo;
    this.cardDescripcion = card.descripcion ?? '';
    this.cardEstado = (card.estado as Estado) ?? 'backlog';
    this.mostrarModalCard.set(true);
  }

  cerrarModalCard() {
    this.mostrarModalCard.set(false);
    this.cardTitulo = '';
    this.cardDescripcion = '';
    this.cardEditandoId.set(null);
  }

  async guardarCard() {
    const g = this.grupo();
    if (!g || !this.cardTitulo.trim()) return;

    try {
      if (this.modoEdicionCard() && this.cardEditandoId()) {
        await this.materiaService.actualizarCard(this.cardEditandoId()!, {
          titulo: this.cardTitulo.trim(),
          descripcion: this.cardDescripcion.trim(),
          estado: this.cardEstado,
        });
        await this.materiaService.registrarLog(
          g.id,
          this.userId()!,
          'editar_card',
          'Card',
          this.cardEditandoId()!
        );
      } else {
        const nueva = await this.materiaService.crearCard(
          g.id,
          this.cardTitulo.trim(),
          this.cardEstado
        );
        if (this.cardDescripcion.trim()) {
          await this.materiaService.actualizarCard(nueva.id, {
            descripcion: this.cardDescripcion.trim(),
          });
        }
        await this.materiaService.registrarLog(
          g.id,
          this.userId()!,
          'crear_card',
          'Card',
          nueva.id
        );
      }
      await this.recargarCards();
      this.cerrarModalCard();
    } catch (e: any) {
      this.error.set(e.message ?? 'Error al guardar la card');
    }
  }

  async eliminarCard(card: Card) {
    const g = this.grupo();
    if (!g) return;
    if (!confirm(`¿Eliminar la card "${card.titulo}"?`)) return;

    try {
      await this.materiaService.eliminarCard(card.id);
      await this.materiaService.registrarLog(
        g.id,
        this.userId()!,
        'eliminar_card',
        'Card',
        card.id
      );
      await this.recargarCards();
    } catch (e: any) {
      this.error.set(e.message ?? 'Error al eliminar la card');
    }
  }

  // ==== Puntuar (profesor) ====

  abrirPuntuar(card: Card) {
    this.cardAPuntuar.set(card);
    this.puntuacionInput = card.puntuacion ?? 0;
    this.comentarioInput = card.comentarioProfesor ?? '';
    this.mostrarModalPuntuar.set(true);
  }

  cerrarPuntuar() {
    this.mostrarModalPuntuar.set(false);
    this.cardAPuntuar.set(null);
    this.puntuacionInput = 0;
    this.comentarioInput = '';
  }

  async guardarPuntuacion() {
    const card = this.cardAPuntuar();
    const g = this.grupo();
    if (!card || !g) return;

    try {
      await this.materiaService.actualizarCard(card.id, {
        puntuacion: this.puntuacionInput,
        comentarioProfesor: this.comentarioInput.trim(),
      });
      await this.materiaService.registrarLog(
        g.id,
        this.userId()!,
        'puntuar_card',
        'Card',
        card.id
      );
      await this.recargarCards();
      this.cerrarPuntuar();
    } catch (e: any) {
      this.error.set(e.message ?? 'Error al guardar la puntuación');
    }
  }

  // ==== Editar nombre del grupo ====

  abrirEditarNombre() {
    const g = this.grupo();
    if (!g) return;
    this.nuevoNombreGrupo = g.nombre;
    this.mostrarModalNombre.set(true);
  }

  cerrarEditarNombre() {
    this.mostrarModalNombre.set(false);
    this.nuevoNombreGrupo = '';
  }

  async guardarNombreGrupo() {
    const g = this.grupo();
    if (!g || !this.nuevoNombreGrupo.trim()) return;
    try {
      const actualizado = await this.materiaService.actualizarGrupo(g.id, {
        nombre: this.nuevoNombreGrupo.trim(),
      });
      this.grupo.set(actualizado);
      await this.materiaService.registrarLog(
        g.id,
        this.userId()!,
        'editar_grupo',
        'Grupo',
        g.id
      );
      this.cerrarEditarNombre();
    } catch (e: any) {
      this.error.set(e.message ?? 'Error al guardar el nombre');
    }
  }

  // ==== Gestionar integrantes ====

  async abrirGestionarIntegrantes() {
    const g = this.grupo();
    if (!g) return;
    try {
      // Tablero independiente: no hay aula de la cual sacar alumnos.
      if (!g.materiaId) {
        this.alumnosAgregables.set([]);
        this.integrantesSeleccionados.set([]);
        this.mostrarModalIntegrantes.set(true);
        return;
      }

      const materia = await this.materiaService.obtenerMateria(g.materiaId);
      if (!materia) throw new Error('Materia no encontrada');

      const alumnos = (materia.alumnos ?? []).filter(
        (a): a is string => !!a && a !== g.adminId
      );

      const ocupados = await this.materiaService.alumnosEnOtroGrupo(
        materia.id,
        alumnos,
        g.id
      );
      const ocupadosSet = new Set(ocupados);

      this.alumnosAgregables.set(alumnos.filter((a) => !ocupadosSet.has(a)));
      this.integrantesSeleccionados.set(
        (g.integrantes ?? []).filter(
          (i): i is string => !!i && i !== g.adminId
        )
      );
      this.mostrarModalIntegrantes.set(true);
    } catch (e: any) {
      this.error.set(e.message ?? 'Error al cargar integrantes');
    }
  }

  cerrarGestionarIntegrantes() {
    this.mostrarModalIntegrantes.set(false);
    this.alumnosAgregables.set([]);
    this.integrantesSeleccionados.set([]);
  }

  toggleIntegrante(id: string) {
    const actuales = this.integrantesSeleccionados();
    if (actuales.includes(id)) {
      this.integrantesSeleccionados.set(actuales.filter((u) => u !== id));
    } else {
      this.integrantesSeleccionados.set([...actuales, id]);
    }
  }

  estaSeleccionado(id: string): boolean {
    return this.integrantesSeleccionados().includes(id);
  }

  async guardarIntegrantes() {
    const g = this.grupo();
    if (!g) return;
    try {
      const integrantes = [g.adminId, ...this.integrantesSeleccionados()];
      const actualizado = await this.materiaService.actualizarGrupo(g.id, {
        integrantes,
      });
      this.grupo.set(actualizado);
      await this.materiaService.registrarLog(
        g.id,
        this.userId()!,
        'editar_integrantes',
        'Grupo',
        g.id
      );
      this.cerrarGestionarIntegrantes();
    } catch (e: any) {
      this.error.set(e.message ?? 'Error al guardar integrantes');
    }
  }

  // ==== Salir del grupo ====

  abrirConfirmarSalir() {
    this.mostrarConfirmarSalir.set(true);
  }

  cancelarSalir() {
    this.mostrarConfirmarSalir.set(false);
  }

  async salirDelGrupo() {
    const g = this.grupo();
    const uid = this.userId();
    if (!g || !uid) return;
    try {
      await this.materiaService.registrarLog(
        g.id,
        uid,
        'salir_grupo',
        'Grupo',
        g.id
      );
      await this.materiaService.salirDeGrupo(g.id, uid);
      if (g.materiaId) {
        this.router.navigate(['/aula', g.materiaId]);
      } else {
        this.router.navigate(['/mis-aulas']);
      }
    } catch (e: any) {
      this.error.set(e.message ?? 'Error al salir del grupo');
    }
  }

  // ==== Eliminar grupo completo ====

  get puedeEliminarGrupo(): boolean {
    return this.esAdminDelGrupo() && this.todasLasCards().length === 0;
  }

  abrirConfirmarEliminarGrupo() {
    this.mostrarConfirmarEliminarGrupo.set(true);
  }

  cancelarEliminarGrupo() {
    this.mostrarConfirmarEliminarGrupo.set(false);
  }

  async eliminarGrupoCompleto() {
    const g = this.grupo();
    if (!g) return;
    try {
      await this.materiaService.eliminarGrupo(g.id);
      if (g.materiaId) {
        this.router.navigate(['/aula', g.materiaId]);
      } else {
        this.router.navigate(['/mis-aulas']);
      }
    } catch (e: any) {
      this.error.set(e.message ?? 'Error al eliminar el grupo');
    }
  }
}