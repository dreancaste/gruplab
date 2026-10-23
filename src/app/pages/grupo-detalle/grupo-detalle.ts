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
type LogActividad = Schema['LogActividad']['type'];
type EvaluacionPar = Schema['EvaluacionPar']['type'];
type Estado = 'backlog' | 'progreso' | 'revision' | 'hecho';

const PESOS_PARTICIPACION = {
  esfuerzo: 50,
  puntualidad: 20,
  colaboracionCalidad: 15,
  pares: 15,
} as const;

const ACCIONES_CON_PUNTOS = new Set([
  'crear_backlog',
  'mover_a_progreso',
  'mover_a_revision',
  'revisar_card',
  'completar_card',
  'reabrir_card',
]);

export interface MetricasParticipacion {
  usuarioId: string;
  esfuerzo: number | null;
  puntualidad: number | null;
  calidad: number | null;
  colaboracion: number | null;
  evaluacionPares: number | null;
  participacion: number | null;
  evaluacionesRecibidas: number;
}

export function calcularMetricasParticipacion(
  integrantes: readonly string[],
  cards: readonly Card[],
  logs: readonly LogActividad[],
  evaluaciones: readonly EvaluacionPar[],
): MetricasParticipacion[] {
  const miembros = [...new Set(integrantes.filter(Boolean))];
  const miembroSet = new Set(miembros);
  const cardPorId = new Map(cards.map((card) => [card.id, card]));
  const logsPorTarjeta = new Map<string, LogActividad[]>();
  for (const log of logs) {
    if (log.entidad !== 'Card' || !ACCIONES_CON_PUNTOS.has(log.accion)) continue;
    const lista = logsPorTarjeta.get(log.entidadId) ?? [];
    lista.push(log);
    logsPorTarjeta.set(log.entidadId, lista);
  }

  const esfuerzoEntregado = new Map(miembros.map((id) => [id, 0]));
  const esfuerzoATiempo = new Map(miembros.map((id) => [id, 0]));
  const esfuerzoConFecha = new Map(miembros.map((id) => [id, 0]));
  const esfuerzoSinRetrabajo = new Map(miembros.map((id) => [id, 0]));
  const esfuerzoCompletado = new Map(miembros.map((id) => [id, 0]));
  const revisiones = new Map(miembros.map((id) => [id, new Set<string>()]));
  let esfuerzoEntregadoTotal = 0;
  let esfuerzoConFechaTotal = 0;
  let calidadAplicable = false;

  for (const card of cards) {
    const eventos = logsPorTarjeta.get(card.id) ?? [];
    const completada = eventos.some((log) => log.accion === 'completar_card');
    const integrantesAsignados = [...new Set(card.asignados ?? [])]
      .filter((id): id is string => !!id && miembroSet.has(id));
    const peso = [1, 3, 5].includes(card.pesoEsfuerzo ?? 1) ? card.pesoEsfuerzo ?? 1 : 1;

    for (const evento of eventos) {
      if (
        evento.accion === 'revisar_card' &&
        completada &&
        miembroSet.has(evento.usuarioId) &&
        !integrantesAsignados.includes(evento.usuarioId)
      ) {
        revisiones.get(evento.usuarioId)?.add(card.id);
      }
    }

    if (card.estado !== 'hecho' || !completada || !integrantesAsignados.length) continue;

    const porIntegrante = peso / integrantesAsignados.length;
    const huboRetrabajo = eventos.some((log) => log.accion === 'reabrir_card');
    calidadAplicable = true;
    for (const asignado of integrantesAsignados) {
      esfuerzoEntregado.set(asignado, esfuerzoEntregado.get(asignado)! + porIntegrante);
      esfuerzoEntregadoTotal += porIntegrante;
      esfuerzoCompletado.set(asignado, esfuerzoCompletado.get(asignado)! + porIntegrante);
      if (!huboRetrabajo) esfuerzoSinRetrabajo.set(asignado, esfuerzoSinRetrabajo.get(asignado)! + porIntegrante);

      if (card.fechaLimite && card.completadaEn != null) {
        esfuerzoConFecha.set(asignado, esfuerzoConFecha.get(asignado)! + porIntegrante);
        esfuerzoConFechaTotal += porIntegrante;
        const completadaEl = new Date(card.completadaEn * 1000);
        const completadaFecha = [
          completadaEl.getFullYear(),
          String(completadaEl.getMonth() + 1).padStart(2, '0'),
          String(completadaEl.getDate()).padStart(2, '0'),
        ].join('-');
        if (completadaFecha <= card.fechaLimite) {
          esfuerzoATiempo.set(asignado, esfuerzoATiempo.get(asignado)! + porIntegrante);
        }
      }
    }
  }

  const entregas = new Map(miembros.map((id) => [
    id,
    esfuerzoEntregadoTotal ? esfuerzoEntregado.get(id)! / esfuerzoEntregadoTotal : 0,
  ]));
  const puntualidadPorPersona = new Map(miembros.map((id) => [
    id,
    esfuerzoConFecha.get(id)! ? esfuerzoATiempo.get(id)! / esfuerzoConFecha.get(id)! : 0,
  ]));
  const calidadPorPersona = new Map(miembros.map((id) => [
    id,
    esfuerzoCompletado.get(id)! ? esfuerzoSinRetrabajo.get(id)! / esfuerzoCompletado.get(id)! : 0,
  ]));
  const colaboracionPorPersona = new Map(miembros.map((id) => [
    id,
    revisiones.get(id)?.size ?? 0,
  ]));
  const puntuacionesPares = new Map(miembros.map((id) => [id, [] as number[]]));
  for (const evaluacion of evaluaciones) {
    if (
      !miembroSet.has(evaluacion.evaluadoId) ||
      !miembroSet.has(evaluacion.evaluadorId) ||
      evaluacion.evaluadoId === evaluacion.evaluadorId
    ) continue;
    const card = cardPorId.get(evaluacion.cardId);
    const hitoRegistrado = (logsPorTarjeta.get(evaluacion.cardId) ?? [])
      .some((log) => log.accion === 'completar_card');
    if (!card || card.estado !== 'hecho' || !hitoRegistrado) continue;
    const puntuaciones = puntuacionesPares.get(evaluacion.evaluadoId)!;
    puntuaciones.push(
      (evaluacion.coordinacion + evaluacion.comunicacion + evaluacion.responsabilidad) / 3,
    );
  }

  const hayEvaluacionCompleta = miembros.length > 1 &&
    miembros.every((id) => (puntuacionesPares.get(id)?.length ?? 0) > 0);
  const paresPorPersona = new Map(miembros.map((id) => [
    id,
    hayEvaluacionCompleta
      ? puntuacionesPares.get(id)!.reduce((total, score) => total + score, 0) /
        puntuacionesPares.get(id)!.length
      : 0,
  ]));

  const esfuerzo = normalizarParticipacion(entregas, esfuerzoEntregadoTotal > 0);
  const puntualidad = normalizarParticipacion(puntualidadPorPersona, esfuerzoConFechaTotal > 0);
  const calidad = normalizarParticipacion(calidadPorPersona, calidadAplicable);
  const colaboracion = normalizarParticipacion(
    colaboracionPorPersona,
    [...colaboracionPorPersona.values()].some((count) => count > 0),
  );
  const pares = normalizarParticipacion(paresPorPersona, hayEvaluacionCompleta);
  const metricasDisponibles = [
    esfuerzo,
    puntualidad,
    calidad !== null || colaboracion !== null ? combinarParticipaciones(calidad, colaboracion) : null,
    pares,
  ];
  const pesosDisponibles = [
    PESOS_PARTICIPACION.esfuerzo,
    PESOS_PARTICIPACION.puntualidad,
    PESOS_PARTICIPACION.colaboracionCalidad,
    PESOS_PARTICIPACION.pares,
  ];
  const pesoTotal = metricasDisponibles.reduce(
    (total, metrica, indice) => total + (metrica ? pesosDisponibles[indice] : 0),
    0,
  );

  return miembros.map((usuarioId, indice) => {
    const comparte = (metrica: Map<string, number> | null) => metrica?.get(usuarioId) ?? null;
    const componentes = [
      esfuerzo?.get(usuarioId) ?? null,
      puntualidad?.get(usuarioId) ?? null,
      combinarParticipaciones(calidad, colaboracion)?.get(usuarioId) ?? null,
      pares?.get(usuarioId) ?? null,
    ];
    const participacion = pesoTotal
      ? componentes.reduce<number>(
          (total, porcentaje, componente) =>
            total + (porcentaje ?? 0) * pesosDisponibles[componente] / pesoTotal,
          0,
        )
      : null;
    return {
      usuarioId,
      esfuerzo: comparte(esfuerzo),
      puntualidad: comparte(puntualidad),
      calidad: comparte(calidad),
      colaboracion: comparte(colaboracion),
      evaluacionPares: comparte(pares),
      participacion,
      evaluacionesRecibidas: puntuacionesPares.get(usuarioId)?.length ?? 0,
    };
  });
}

function normalizarParticipacion(
  valores: Map<string, number>,
  disponible: boolean,
): Map<string, number> | null {
  const total = [...valores.values()].reduce((suma, valor) => suma + valor, 0);
  if (!disponible) return null;
  if (!total) {
    const integrantes = valores.size;
    return integrantes
      ? new Map([...valores.keys()].map((id) => [id, 100 / integrantes]))
      : null;
  }
  return new Map([...valores].map(([id, valor]) => [id, valor / total * 100]));
}

function combinarParticipaciones(
  ...metricas: Array<Map<string, number> | null>
): Map<string, number> | null {
  const disponibles = metricas.filter((metrica): metrica is Map<string, number> => metrica !== null);
  if (!disponibles.length) return null;
  const ids = new Set(disponibles.flatMap((metrica) => [...metrica.keys()]));
  return new Map(
    [...ids].map((id) => [
      id,
      disponibles.reduce((total, metrica) => total + (metrica.get(id) ?? 0), 0) / disponibles.length,
    ]),
  );
}

@Component({
  selector: 'app-grupo-detalle',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule],
  templateUrl: './grupo-detalle.html',
  styleUrl: './grupo-detalle.scss',
})
export class GrupoDetalle implements OnInit {
  readonly listasConectadas = ['backlog', 'progreso', 'revision', 'hecho'];

  grupo = signal<Grupo | null>(null);
  userId = signal<string | null>(null);
  esDocente = signal(false);
  cargando = signal(true);
  error = signal<string | null>(null);

  todasLasCards = signal<Card[]>([]);
  logs = signal<LogActividad[]>([]);
  evaluaciones = signal<EvaluacionPar[]>([]);
  integrantesGrupo = computed(() =>
    (this.grupo()?.integrantes ?? []).filter(
      (integrante): integrante is string => !!integrante,
    ),
  );

  metricasParticipacion = computed(() => {
    return calcularMetricasParticipacion(
      this.integrantesGrupo(),
      this.todasLasCards(),
      this.logs(),
      this.evaluaciones(),
    );
  });
  formulaParticipacion = computed(() => {
    const metrics = this.metricasParticipacion();
    const disponible = (key: keyof MetricasParticipacion) =>
      metrics.some((integrante) => integrante[key] !== null);
    const factores = [
      disponible('esfuerzo') ? PESOS_PARTICIPACION.esfuerzo : 0,
      disponible('puntualidad') ? PESOS_PARTICIPACION.puntualidad : 0,
      disponible('calidad') || disponible('colaboracion')
        ? PESOS_PARTICIPACION.colaboracionCalidad
        : 0,
      disponible('evaluacionPares') ? PESOS_PARTICIPACION.pares : 0,
    ];
    const suma = factores.reduce((total, factor) => total + factor, 0);
    return suma
      ? {
          esfuerzo: factores[0] / suma * 100,
          puntualidad: factores[1] / suma * 100,
          calidadColaboracion: factores[2] / suma * 100,
          pares: factores[3] / suma * 100,
        }
      : null;
  });

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

  // Admin del grupo (el creador del grupo o cualquier docente del aula)
  esAdminDelGrupo = computed(() => {
    const g = this.grupo();
    const uid = this.userId();
    return (!!g && !!uid && g.adminId === uid) || this.esDocente();
  });
  puedeRevisar = (card: Card): boolean => {
    const usuarioId = this.userId();
    return !!usuarioId &&
      card.estado === 'revision' &&
      this.integrantesGrupo().includes(usuarioId) &&
      !(card.asignados ?? []).includes(usuarioId) &&
      card.revisadaPor !== usuarioId;
  };

  // Detectar si es tablero independiente
  get esTableroIndependiente(): boolean {
    return !this.grupo()?.materiaId;
  }

  // Modal crear/editar card
  mostrarModalCard = signal(false);
  modoEdicionCard = signal(false);
  cardEditandoId = signal<string | null>(null);
  cardPlanificacionBloqueada = false;
  cardTitulo = '';
  cardDescripcion = '';
  cardPesoEsfuerzo: 1 | 3 | 5 = 1;
  cardFechaLimite = '';
  asignadosSeleccionados = signal<string[]>([]);

  // Evaluación entre pares al completar una tarea
  tarjetaAEvaluar = signal<Card | null>(null);
  evaluadoSeleccionadoId = '';
  puntuacionCoordinacion = 5;
  puntuacionComunicacion = 5;
  puntuacionResponsabilidad = 5;

  // Modal seguimiento de tarea (profesor)
  readonly opcionesSeguimiento = [
    'A trabajar',
    'En buen camino',
    'Incompleto',
    'Bien hecho',
  ] as const;
  mostrarModalPuntuar = signal(false);
  cardAPuntuar = signal<Card | null>(null);
  seguimientoInput = '';
  puntuacionInput = 0;
  comentarioInput = '';

  // Modal calificar grupo e integrantes (banner de nota final y nota por integrante)
  mostrarModalCalificarGrupo = signal(false);
  notaFinalGrupoInput: number | null = 8;
  comentarioGrupoInput = '';
  notasIntegrantesInput = signal<Record<string, number>>({});

  // Modal editar nombre del grupo
  mostrarModalNombre = signal(false);
  nuevoNombreGrupo = '';

  // Modal gestionar integrantes
  mostrarModalIntegrantes = signal(false);
  alumnosAgregables = signal<string[]>([]);
  alumnosDisponiblesParaAgregar = signal<string[]>([]);
  integrantesSeleccionados = signal<string[]>([]);

  // Confirmaciones
  mostrarConfirmarSalir = signal(false);
  mostrarConfirmarEliminarGrupo = signal(false);
  confirmacionPendiente = signal<{
    titulo: string;
    mensaje: string;
    textoBoton: string;
    ejecutar: () => Promise<void>;
  } | null>(null);

  solicitarConfirmacion(
    titulo: string,
    mensaje: string,
    textoBoton: string,
    ejecutar: () => Promise<void>,
  ) {
    this.confirmacionPendiente.set({ titulo, mensaje, textoBoton, ejecutar });
  }

  cerrarConfirmacionPendiente() {
    this.confirmacionPendiente.set(null);
  }

  async confirmarAccionPendiente() {
    const actual = this.confirmacionPendiente();
    if (!actual) return;
    this.confirmacionPendiente.set(null);
    await actual.ejecutar();
  }

  // Adjuntos & Detalle de card
  adjuntosUrls = signal<Record<string, string>>({});
  subiendoAdjuntoCardId = signal<string | null>(null);
  cardDetalle = signal<Card | null>(null);
  cargandoUrlsDetalle = signal(false);

  // Perfiles de usuario & Historial de actividad
  usuariosMap = signal<Record<string, string>>({
    'b34c1aaa-5011-704e-e9bf-e6f62c2ee306': 'luciano.barbosa30@gmail.com',
    'b3dc0ada-20e1-70bf-133e-5ce5f6c2d36c': 'luciano_l17@hotmail.com',
    'd3bcaaea-8091-7090-e940-37cf06abf4c1': 'leandroserapio95@gmail.com',
    '34181498-4001-7030-bfe0-92e87e7858b3': 'luciano_l17@hotmail.com',
  });
  mostrarModalLogs = signal(false);

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

      this.auth.getEmail?.().then((email) => {
        if (email) {
          this.usuariosMap.update((m) => ({ ...m, [userId]: email }));
          this.materiaService.sincronizarPerfilUsuario?.(userId, email);
        }
      }).catch(() => {});

      const grupo = await this.materiaService.obtenerGrupo(grupoId);
      if (!grupo) throw new Error('Grupo no encontrado');
      this.grupo.set(grupo);

      if (this.materiaService.obtenerMapaUsuarios) {
        const mapa = await this.materiaService.obtenerMapaUsuarios();
        this.usuariosMap.update((actual) => ({ ...actual, ...mapa }));
      }

      // Determinar rol y validar acceso
      if (grupo.materiaId) {
        const materia = await this.materiaService.obtenerMateria(grupo.materiaId);
        if (!materia) throw new Error('Materia no encontrada');
        const rol = this.materiaService.obtenerRol(materia, userId);
        const docente = rol === 'admin' || rol === 'profesor';
        this.esDocente.set(docente);

        const perteneceAlGrupo = (grupo.integrantes ?? []).includes(userId);
        if (!docente && !perteneceAlGrupo) {
          this.router.navigate(['/aula', grupo.materiaId]);
          return;
        }
      } else {
        this.esDocente.set(false);
      }

      await this.recargarCards();
      await this.recargarLogs();
      await this.recargarEvaluaciones();
    } catch (e: any) {
      this.error.set(e.message ?? 'Error al cargar el grupo');
    } finally {
      this.cargando.set(false);
    }
  }

  private ordenar(cards: Card[]): Card[] {
    return [...cards].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
  }

  private async cargarUrlsAdjuntos(cards: Card[]) {
    const todasLasKeys = new Set<string>();
    for (const card of cards) {
      for (const key of card.adjuntos ?? []) {
        if (key) todasLasKeys.add(key);
      }
    }
    const urlsActuales = { ...this.adjuntosUrls() };
    let cambios = false;
    await Promise.all(
      Array.from(todasLasKeys).map(async (key) => {
        if (!urlsActuales[key]) {
          try {
            const url = await this.materiaService.obtenerUrlAdjunto(key);
            urlsActuales[key] = url;
            cambios = true;
          } catch (e) {
            console.warn('No se pudo precargar URL para', key, e);
          }
        }
      }),
    );
    if (cambios) {
      this.adjuntosUrls.set(urlsActuales);
    }
  }

  private async recargarCards() {
    const g = this.grupo();
    if (!g) return;
    const cards = await this.materiaService.listarCardsDeGrupo(g.id);
    this.todasLasCards.set(cards);
    await this.cargarUrlsAdjuntos(cards);
  }

  private async recargarLogs() {
    const g = this.grupo();
    if (!g) return;
    this.logs.set(await this.materiaService.listarLogsDeGrupo(g.id));
  }

  private async recargarEvaluaciones() {
    const g = this.grupo();
    if (!g) return;
    this.evaluaciones.set(await this.materiaService.listarEvaluacionesDeGrupo(g.id));
  }

  async marcarRevisada(card: Card) {
    const grupo = this.grupo();
    const usuarioId = this.userId();
    if (!grupo || !usuarioId || card.estado !== 'revision') return;
    if (!this.integrantesGrupo().includes(usuarioId)) {
      this.error.set('Solo los integrantes del grupo pueden revisar esta tarea.');
      return;
    }
    if ((card.asignados ?? []).includes(usuarioId)) {
      this.error.set('La revisión debe hacerla alguien que no esté asignado a esta tarea.');
      return;
    }

    try {
      await this.materiaService.actualizarCard(card.id, {
        revisadaPor: usuarioId,
        revisadaEn: Math.floor(Date.now() / 1000),
      });
      await this.materiaService.registrarLog(
        grupo.id,
        usuarioId,
        'revisar_card',
        'Card',
        card.id,
      );
      await this.recargarCards();
      await this.recargarLogs();
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Error al registrar la revisión');
    }
  }

  evaluadosPendientes(card: Card): string[] {
    const usuarioId = this.userId();
    if (!usuarioId || card.estado !== 'hecho') return [];
    return this.integrantesGrupo().filter(
      (integranteId) =>
        integranteId !== usuarioId &&
        !this.evaluaciones().some(
          (evaluacion) =>
            evaluacion.cardId === card.id &&
            evaluacion.hito === 'hecho' &&
            evaluacion.evaluadorId === usuarioId &&
            evaluacion.evaluadoId === integranteId,
        ),
    );
  }

  abrirEvaluacion(card: Card) {
    const pendientes = this.evaluadosPendientes(card);
    if (!pendientes.length) return;
    this.error.set(null);
    this.tarjetaAEvaluar.set(card);
    this.evaluadoSeleccionadoId = pendientes[0];
    this.puntuacionCoordinacion = 5;
    this.puntuacionComunicacion = 5;
    this.puntuacionResponsabilidad = 5;
  }

  cerrarEvaluacion() {
    this.tarjetaAEvaluar.set(null);
    this.evaluadoSeleccionadoId = '';
  }

  async guardarEvaluacion() {
    const card = this.tarjetaAEvaluar();
    const grupo = this.grupo();
    const evaluadorId = this.userId();
    const evaluadoId = this.evaluadoSeleccionadoId;
    if (!card || !grupo || !evaluadorId || !evaluadoId) return;
    if (!this.evaluadosPendientes(card).includes(evaluadoId)) {
      this.error.set('Ya evaluaste a esta persona para esta tarea.');
      return;
    }

    const puntuaciones = [
      this.puntuacionCoordinacion,
      this.puntuacionComunicacion,
      this.puntuacionResponsabilidad,
    ];
    if (puntuaciones.some((puntuacion) => !Number.isInteger(puntuacion) || puntuacion < 1 || puntuacion > 5)) {
      this.error.set('Cada respuesta debe ser un número entero entre 1 y 5.');
      return;
    }

    const id = [
      'pares',
      card.id,
      'hecho',
      evaluadorId,
      evaluadoId,
    ].map(encodeURIComponent).join('|');
    try {
      await this.materiaService.guardarEvaluacionPar({
        id,
        grupoId: grupo.id,
        cardId: card.id,
        hito: 'hecho',
        evaluadorId,
        evaluadoId,
        coordinacion: this.puntuacionCoordinacion,
        comunicacion: this.puntuacionComunicacion,
        responsabilidad: this.puntuacionResponsabilidad,
        timestamp: Math.floor(Date.now() / 1000),
      });
      await this.recargarEvaluaciones();
      this.cerrarEvaluacion();
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Error al guardar la evaluación');
    }
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
    if (!card) return;
    if (
      event.previousContainer === event.container &&
      event.previousIndex === event.currentIndex
    ) {
      return;
    }

    const usuarioId = this.userId();
    if (!usuarioId) return;
    const estadoAnterior = card.estado ?? 'backlog';
    if (nuevoEstado === 'hecho' && estadoAnterior !== 'hecho') {
      if (!(card.asignados ?? []).some((id) => !!id)) {
        this.error.set('Asigná al menos una persona antes de completar la tarea.');
        return;
      }
      if (!card.revisadaPor || (card.asignados ?? []).includes(card.revisadaPor)) {
        this.error.set('Antes de completar, otra persona del grupo debe revisar esta tarea.');
        return;
      }
    }

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
      const listasActualizadas = event.previousContainer === event.container
        ? [{ cards: event.container.data, estado: nuevoEstado }]
        : [
            { cards: event.previousContainer.data, estado: estadoAnterior },
            { cards: event.container.data, estado: nuevoEstado },
          ];
      const actualizaciones = new Map<
        string,
        Partial<{
          estado: Estado;
          orden: number;
          revisadaPor: string | null;
          revisadaEn: number | null;
          completadaEn: number | null;
        }>
      >();
      for (const lista of listasActualizadas) {
        lista.cards.forEach((tarjeta, orden) => {
          actualizaciones.set(tarjeta.id, { estado: lista.estado, orden });
        });
      }
      const cambiosTarjeta = actualizaciones.get(card.id)!;
      if (nuevoEstado === 'hecho' && estadoAnterior !== 'hecho') {
        cambiosTarjeta.completadaEn = Math.floor(Date.now() / 1000);
      } else if (nuevoEstado !== 'hecho' && estadoAnterior === 'hecho') {
        cambiosTarjeta.completadaEn = null;
        cambiosTarjeta.revisadaPor = null;
        cambiosTarjeta.revisadaEn = null;
      } else if (nuevoEstado === 'revision' && estadoAnterior !== 'revision') {
        cambiosTarjeta.revisadaPor = null;
        cambiosTarjeta.revisadaEn = null;
      }

      const tarjetasModificadas = this.todasLasCards().filter((tarjeta) => {
        const cambio = actualizaciones.get(tarjeta.id);
        return cambio && (tarjeta.estado !== cambio.estado || tarjeta.orden !== cambio.orden);
      });
      this.todasLasCards.update((tarjetas) =>
        tarjetas.map((tarjeta) => {
          const cambio = actualizaciones.get(tarjeta.id);
          return cambio ? { ...tarjeta, ...cambio } : tarjeta;
        }),
      );
      await Promise.all(
        tarjetasModificadas.map((tarjeta) =>
          this.materiaService.actualizarCard(tarjeta.id, actualizaciones.get(tarjeta.id)!),
        ),
      );

      if (estadoAnterior !== nuevoEstado) {
        const accion = this.accionParaTransicion(nuevoEstado);
        const esHitoUnico = accion === 'mover_a_progreso' || accion === 'mover_a_revision';
        if (accion && (!esHitoUnico || !this.logs().some(
          (log) => log.usuarioId === usuarioId &&
            log.entidadId === card.id &&
            log.accion === accion,
        ))) {
          await this.materiaService.registrarLog(card.grupoId, usuarioId, accion, 'Card', card.id);
        }
        if (nuevoEstado === 'hecho') await this.recargarEvaluaciones();
        if (estadoAnterior === 'hecho' && nuevoEstado !== 'hecho') {
          await this.materiaService.registrarLog(card.grupoId, usuarioId, 'reabrir_card', 'Card', card.id);
        }
      }
      await this.recargarCards();
      await this.recargarLogs();
      await this.recargarEvaluaciones();
    } catch (e: any) {
      this.error.set(e.message ?? 'Error al mover la card');
      await this.recargarCards();
      await this.recargarLogs();
    }
  }

  private accionParaTransicion(estado: Estado): string | null {
    if (estado === 'progreso') return 'mover_a_progreso';
    if (estado === 'revision') return 'mover_a_revision';
    if (estado === 'hecho') return 'completar_card';
    return null;
  }

  // ==== Crear / editar card ====

  abrirCrearCard() {
    this.error.set(null);
    this.modoEdicionCard.set(false);
    this.cardEditandoId.set(null);
    this.cardPlanificacionBloqueada = false;
    this.cardTitulo = '';
    this.cardDescripcion = '';
    this.cardPesoEsfuerzo = 1;
    this.cardFechaLimite = '';
    const uid = this.userId();
    this.asignadosSeleccionados.set(
      uid && this.integrantesGrupo().includes(uid) ? [uid] : [],
    );
    this.mostrarModalCard.set(true);
  }

  abrirEditarCard(card: Card) {
    this.error.set(null);
    this.modoEdicionCard.set(true);
    this.cardEditandoId.set(card.id);
    this.cardPlanificacionBloqueada =
      card.estado !== 'backlog' &&
      card.pesoEsfuerzo != null &&
      !!card.asignados?.length;
    this.cardTitulo = card.titulo;
    this.cardDescripcion = card.descripcion ?? '';
    this.cardPesoEsfuerzo = [1, 3, 5].includes(card.pesoEsfuerzo ?? 1)
      ? (card.pesoEsfuerzo ?? 1) as 1 | 3 | 5
      : 1;
    this.cardFechaLimite = card.fechaLimite ?? '';
    this.asignadosSeleccionados.set(
      (card.asignados ?? []).filter((integrante): integrante is string => !!integrante),
    );
    this.mostrarModalCard.set(true);
  }

  toggleAsignado(integranteId: string) {
    const asignados = this.asignadosSeleccionados();
    this.asignadosSeleccionados.set(
      asignados.includes(integranteId)
        ? asignados.filter((id) => id !== integranteId)
        : [...asignados, integranteId],
    );
  }

  cerrarModalCard() {
    this.mostrarModalCard.set(false);
    this.cardTitulo = '';
    this.cardDescripcion = '';
    this.cardEditandoId.set(null);
    this.cardPlanificacionBloqueada = false;
    this.asignadosSeleccionados.set([]);
  }

  async guardarCard() {
    const g = this.grupo();
    if (!g || !this.cardTitulo.trim()) return;
    if (!this.asignadosSeleccionados().length && this.integrantesGrupo().length > 0) {
      this.error.set('Asigná la tarea a por lo menos un integrante.');
      return;
    }

    try {
      if (this.modoEdicionCard() && this.cardEditandoId()) {
        await this.materiaService.actualizarCard(this.cardEditandoId()!, {
          titulo: this.cardTitulo.trim(),
          descripcion: this.cardDescripcion.trim(),
          ...(!this.cardPlanificacionBloqueada
            ? {
                pesoEsfuerzo: this.cardPesoEsfuerzo,
                asignados: this.asignadosSeleccionados(),
              }
            : {}),
          ...(this.esDocente()
            ? { fechaLimite: this.cardFechaLimite || null }
            : {}),
        });
        await this.materiaService.registrarLog(
          g.id,
          this.userId()!,
          'editar_card',
          'Card',
          this.cardEditandoId()!
        );
      } else {
        const nueva = await this.materiaService.crearCard(g.id, this.cardTitulo.trim(), {
          pesoEsfuerzo: this.cardPesoEsfuerzo,
          asignados: this.asignadosSeleccionados(),
          ...(this.esDocente() && this.cardFechaLimite
            ? { fechaLimite: this.cardFechaLimite }
            : {}),
        });
        if (this.cardDescripcion.trim()) {
          await this.materiaService.actualizarCard(nueva.id, {
            descripcion: this.cardDescripcion.trim(),
          });
        }
        await this.materiaService.registrarLog(
          g.id,
          this.userId()!,
          'crear_backlog',
          'Card',
          nueva.id
        );
      }
      await this.recargarCards();
      await this.recargarLogs();
      this.cerrarModalCard();
    } catch (e: any) {
      this.error.set(e.message ?? 'Error al guardar la card');
    }
  }

  eliminarCard(card: Card) {
    const g = this.grupo();
    if (!g) return;
    this.solicitarConfirmacion(
      'Eliminar tarea',
      `¿Seguro que querés eliminar la tarea "${card.titulo}"? Esta acción no se puede deshacer.`,
      'Eliminar tarea',
      async () => {
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
          await this.recargarLogs();
        } catch (e: any) {
          this.error.set(e.message ?? 'Error al eliminar la card');
        }
      },
    );
  }

  async subirArchivo(card: Card, event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.subiendoAdjuntoCardId.set(card.id);
    this.error.set(null);
    try {
      const key = await this.materiaService.subirAdjunto(card.id, file);
      await this.materiaService.registrarLog(
        card.grupoId,
        this.userId()!,
        'adjuntar_archivo',
        'Card',
        card.id,
      );
      await this.recargarCards();
      if (this.cardDetalle()?.id === card.id) {
        const refreshed = this.todasLasCards().find((c) => c.id === card.id);
        if (refreshed) this.cardDetalle.set(refreshed);
      }
      try {
        const url = await this.materiaService.obtenerUrlAdjunto(key);
        this.adjuntosUrls.update((urls) => ({ ...urls, [key]: url }));
      } catch {}
    } catch (e: any) {
      this.error.set(e.message ?? 'No se pudo adjuntar el archivo');
    } finally {
      this.subiendoAdjuntoCardId.set(null);
      input.value = '';
    }
  }

  abrirSelectorArchivo(input: HTMLInputElement | null) {
    input?.click();
  }

  esImagen(key: string): boolean {
    if (!key) return false;
    const ext = key.split('.').pop()?.toLowerCase();
    return ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp'].includes(ext ?? '');
  }

  esPdf(key: string): boolean {
    if (!key) return false;
    return key.toLowerCase().endsWith('.pdf');
  }

  nombreAdjunto(key: string): string {
    if (!key) return 'archivo';
    const base = key.split('/').pop() || 'archivo';
    return base.replace(/^\d+-/, '');
  }

  iconoAdjunto(key: string): string {
    if (this.esImagen(key)) return '🖼️';
    if (this.esPdf(key)) return '📕';
    const ext = key.split('.').pop()?.toLowerCase();
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext ?? '')) return '📦';
    if (['doc', 'docx', 'txt', 'md', 'rtf'].includes(ext ?? '')) return '📝';
    if (['xls', 'xlsx', 'csv'].includes(ext ?? '')) return '📊';
    return '📎';
  }

  primerImagenAdjunta(card: Card): string | null {
    const adjuntos = card.adjuntos ?? [];
    for (const key of adjuntos) {
      if (key && this.esImagen(key) && this.adjuntosUrls()[key]) {
        return key;
      }
    }
    return null;
  }

  async abrirDetalleCard(card: Card) {
    this.cardDetalle.set(card);
    if (card.adjuntos?.length) {
      this.cargandoUrlsDetalle.set(true);
      try {
        await this.cargarUrlsAdjuntos([card]);
      } finally {
        this.cargandoUrlsDetalle.set(false);
      }
    }
  }

  cerrarDetalleCard() {
    this.cardDetalle.set(null);
  }

  estadoLabel(estado: string | null | undefined): string {
    const map: Record<string, string> = {
      backlog: 'Backlog',
      progreso: 'En progreso',
      revision: 'Revisión',
      hecho: 'Hecho',
    };
    return estado ? (map[estado] ?? estado) : '';
  }

  async abrirAdjunto(key: string) {
    if (!key) return;
    try {
      let url = this.adjuntosUrls()[key];
      if (!url) {
        url = await this.materiaService.obtenerUrlAdjunto(key);
        this.adjuntosUrls.update((u) => ({ ...u, [key]: url }));
      }
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e: any) {
      this.error.set(e.message ?? 'No se pudo abrir el archivo');
    }
  }

  eliminarAdjunto(card: Card, key: string, event?: Event) {
    event?.stopPropagation();
    this.solicitarConfirmacion(
      'Eliminar adjunto',
      `¿Seguro que querés eliminar el archivo "${this.nombreAdjunto(key)}"?`,
      'Eliminar archivo',
      async () => {
        try {
          await this.materiaService.eliminarAdjunto(card.id, key);
          await this.materiaService.registrarLog(
            card.grupoId,
            this.userId()!,
            'eliminar_adjunto',
            'Card',
            card.id,
          );
          await this.recargarCards();
          await this.recargarLogs();
          if (this.cardDetalle()?.id === card.id) {
            const refreshed = this.todasLasCards().find((c) => c.id === card.id);
            if (refreshed) this.cardDetalle.set(refreshed);
          }
        } catch (e: any) {
          this.error.set(e.message ?? 'Error al eliminar el adjunto');
        }
      },
    );
  }

  // ==== Seguimiento de tareas (profesor) & Calificación de grupo ====

  etiquetaSeguimiento(card: Card | null | undefined): string | null {
    const raw = card?.comentarioProfesor ?? '';
    const match = raw.match(/^\[(A trabajar|En buen camino|Incompleto|Bien hecho)\]\s*(.*)$/s);
    return match ? match[1] : null;
  }

  comentarioLimpio(card: Card | null | undefined): string {
    const raw = card?.comentarioProfesor ?? '';
    const match = raw.match(/^\[(A trabajar|En buen camino|Incompleto|Bien hecho)\]\s*(.*)$/s);
    return match ? match[2].trim() : raw;
  }

  claseSeguimiento(etiqueta: string | null): string {
    if (etiqueta === 'A trabajar') return 'seg-trabajar';
    if (etiqueta === 'En buen camino') return 'seg-buen-camino';
    if (etiqueta === 'Incompleto') return 'seg-incompleto';
    if (etiqueta === 'Bien hecho') return 'seg-bien-hecho';
    return '';
  }

  abrirPuntuar(card: Card) {
    this.cardAPuntuar.set(card);
    this.seguimientoInput = this.etiquetaSeguimiento(card) ?? 'En buen camino';
    this.puntuacionInput = card.puntuacion ?? 0;
    this.comentarioInput = this.comentarioLimpio(card);
    this.mostrarModalPuntuar.set(true);
  }

  cerrarPuntuar() {
    this.mostrarModalPuntuar.set(false);
    this.cardAPuntuar.set(null);
    this.seguimientoInput = '';
    this.puntuacionInput = 0;
    this.comentarioInput = '';
  }

  async guardarPuntuacion() {
    const card = this.cardAPuntuar();
    const g = this.grupo();
    if (!card || !g) return;

    try {
      const etiqueta = this.seguimientoInput ? `[${this.seguimientoInput}]` : '';
      const obs = this.comentarioInput.trim();
      const comentarioFinal = etiqueta ? (obs ? `${etiqueta} ${obs}` : etiqueta) : obs;

      await this.materiaService.actualizarCard(card.id, {
        comentarioProfesor: comentarioFinal,
      });
      await this.materiaService.registrarLog(
        g.id,
        this.userId()!,
        'puntuar_card',
        'Card',
        card.id
      );
      await this.recargarCards();
      await this.recargarLogs();
      if (this.cardDetalle()?.id === card.id) {
        const refreshed = this.todasLasCards().find((c) => c.id === card.id);
        if (refreshed) this.cardDetalle.set(refreshed);
      }
      this.cerrarPuntuar();
    } catch (e: any) {
      this.error.set(e.message ?? 'Error al guardar el estado de seguimiento');
    }
  }

  // ==== Calificación Final del Grupo y Nota por Integrante (Banner) ====

  calificacionGrupo = computed<{
    notaFinal: number | null;
    comentario: string;
    notasIntegrantes: Record<string, number>;
    docenteId: string;
    timestamp: number;
  } | null>(() => {
    const logsCalif = this.logs()
      .filter((l) => l.entidad === 'CalificacionGrupo' && l.accion === 'calificar_grupo')
      .sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));
    if (!logsCalif.length) return null;
    const ultimo = logsCalif[0];
    try {
      const parsed = JSON.parse(ultimo.entidadId || '{}');
      return {
        notaFinal: typeof parsed.notaFinal === 'number' ? parsed.notaFinal : null,
        comentario: parsed.comentario ?? '',
        notasIntegrantes: parsed.notasIntegrantes ?? {},
        docenteId: ultimo.usuarioId,
        timestamp: ultimo.timestamp,
      };
    } catch {
      return null;
    }
  });

  abrirCalificarGrupo() {
    const actual = this.calificacionGrupo();
    this.notaFinalGrupoInput = actual?.notaFinal ?? 8;
    this.comentarioGrupoInput = actual?.comentario ?? '';
    const mapaNotas: Record<string, number> = {};
    for (const uid of this.integrantesGrupo()) {
      mapaNotas[uid] = actual?.notasIntegrantes?.[uid] ?? (actual?.notaFinal ?? 8);
    }
    this.notasIntegrantesInput.set(mapaNotas);
    this.mostrarModalCalificarGrupo.set(true);
  }

  cerrarCalificarGrupo() {
    this.mostrarModalCalificarGrupo.set(false);
  }

  setNotaIntegrante(uid: string, valor: string | number) {
    const num = Number(valor);
    this.notasIntegrantesInput.update((actual) => ({
      ...actual,
      [uid]: Number.isFinite(num) ? Math.max(0, Math.min(10, num)) : 0,
    }));
  }

  async guardarCalificacionFinalGrupo() {
    const g = this.grupo();
    const uid = this.userId();
    if (!g || !uid || !this.esDocente()) return;

    this.error.set(null);
    try {
      const notaFinal =
        this.notaFinalGrupoInput !== null && Number.isFinite(Number(this.notaFinalGrupoInput))
          ? Math.max(0, Math.min(10, Number(this.notaFinalGrupoInput)))
          : null;
      await this.materiaService.guardarCalificacionGrupo(g.id, uid, {
        notaFinal,
        comentario: this.comentarioGrupoInput.trim(),
        notasIntegrantes: this.notasIntegrantesInput(),
      });
      await this.recargarLogs();
      this.cerrarCalificarGrupo();
    } catch (e: any) {
      this.error.set(e.message ?? 'Error al guardar la calificación del grupo');
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

      const docentesSet = new Set<string>([
        ...(materia.creadorId ? [materia.creadorId] : []),
        ...((materia.admins ?? []).filter((x): x is string => !!x)),
        ...((materia.profesores ?? []).filter((x): x is string => !!x)),
      ]);

      const candidatosSet = new Set<string>();
      for (const a of materia.alumnos ?? []) {
        if (a && !docentesSet.has(a)) candidatosSet.add(a);
      }
      for (const i of g.integrantes ?? []) {
        if (i && !docentesSet.has(i)) candidatosSet.add(i);
      }

      const alumnos = Array.from(candidatosSet).filter(
        (a) => this.esDocente() || a !== g.adminId
      );

      const ocupados = await this.materiaService.alumnosEnOtroGrupo(
        materia.id,
        alumnos,
        g.id
      );
      const ocupadosSet = new Set(ocupados);

      const disponibles = alumnos.filter((a) => !ocupadosSet.has(a));
      this.alumnosAgregables.set(disponibles);
      const actualesSet = new Set((g.integrantes ?? []).filter((i): i is string => !!i));
      this.alumnosDisponiblesParaAgregar.set(disponibles.filter((a) => !actualesSet.has(a)));
      this.integrantesSeleccionados.set(
        (g.integrantes ?? []).filter(
          (i): i is string => !!i && !docentesSet.has(i) && (this.esDocente() || i !== g.adminId)
        )
      );
      this.mostrarModalIntegrantes.set(true);
    } catch (e: any) {
      this.error.set(e.message ?? 'Error al cargar integrantes');
    }
  }

  async agregarIntegranteDirecto(alumnoId: string) {
    const g = this.grupo();
    if (!g || !alumnoId) return;
    this.error.set(null);
    try {
      const actualizado = await this.materiaService.agregarIntegranteAGrupo(g.id, alumnoId);
      this.grupo.set(actualizado);
      await this.materiaService.registrarLog(
        g.id,
        this.userId()!,
        'editar_integrantes',
        'Grupo',
        g.id,
      );
      await this.recargarLogs();
      await this.abrirGestionarIntegrantes();
    } catch (e: any) {
      this.error.set(e.message ?? 'Error al agregar integrante');
    }
  }

  eliminarIntegranteDirecto(alumnoId: string) {
    const g = this.grupo();
    if (!g || !alumnoId || !this.esDocente()) return;
    this.solicitarConfirmacion(
      'Quitar integrante del grupo',
      `¿Seguro que querés quitar a "${this.nombreUsuario(alumnoId)}" de este grupo?`,
      'Quitar del grupo',
      async () => {
        this.error.set(null);
        try {
          const actualizado = await this.materiaService.eliminarIntegranteDeGrupo(g.id, alumnoId);
          this.grupo.set(actualizado);
          await this.materiaService.registrarLog(
            g.id,
            this.userId()!,
            'editar_integrantes',
            'Grupo',
            g.id,
          );
          await this.recargarLogs();
          await this.abrirGestionarIntegrantes();
        } catch (e: any) {
          this.error.set(e.message ?? 'Error al eliminar integrante');
        }
      },
    );
  }

  cerrarGestionarIntegrantes() {
    this.mostrarModalIntegrantes.set(false);
    this.alumnosAgregables.set([]);
    this.alumnosDisponiblesParaAgregar.set([]);
    this.integrantesSeleccionados.set([]);
  }

  yaEsIntegranteActual(id: string): boolean {
    return (this.grupo()?.integrantes ?? []).includes(id);
  }

  bloqueadoParaQuitar(id: string): boolean {
    // Como alumno admin del grupo, no puede eliminar integrantes existentes
    return !this.esDocente() && this.yaEsIntegranteActual(id);
  }

  toggleIntegrante(id: string) {
    const actuales = this.integrantesSeleccionados();
    if (actuales.includes(id)) {
      if (this.bloqueadoParaQuitar(id)) return;
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
      let integrantes: string[];
      if (this.esDocente()) {
        integrantes = [...new Set(this.integrantesSeleccionados())];
      } else {
        const actuales = (g.integrantes ?? []).filter((i): i is string => !!i);
        integrantes = [...new Set([g.adminId, ...actuales, ...this.integrantesSeleccionados()])];
      }
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
    return this.esDocente() || (this.esAdminDelGrupo() && this.todasLasCards().length === 0);
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

  // ==== Solicitudes de acceso al grupo ====

  solicitudesPendientes = computed(() => {
    const integrantesSet = new Set(this.integrantesGrupo());
    const ordenados = [...this.logs()].sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));
    const estadoPorUsuario = new Map<string, 'pendiente' | 'resuelta'>();

    for (const log of ordenados) {
      if (log.entidad !== 'SolicitudGrupo' || !log.entidadId) continue;
      if (log.accion === 'solicitar_acceso') {
        estadoPorUsuario.set(log.entidadId, 'pendiente');
      } else if (log.accion === 'aprobar_acceso' || log.accion === 'rechazar_acceso') {
        estadoPorUsuario.set(log.entidadId, 'resuelta');
      }
    }

    const pendientes: string[] = [];
    for (const [uid, estado] of estadoPorUsuario.entries()) {
      if (estado === 'pendiente' && !integrantesSet.has(uid)) {
        pendientes.push(uid);
      }
    }
    return pendientes;
  });

  async responderSolicitud(solicitanteId: string, aprobar: boolean) {
    const g = this.grupo();
    const uid = this.userId();
    if (!g || !uid) return;

    this.error.set(null);
    try {
      if (aprobar && g.materiaId) {
        const ocupados = await this.materiaService.alumnosEnOtroGrupo(
          g.materiaId,
          [solicitanteId],
          g.id,
        );
        if (ocupados.length > 0) {
          this.error.set('Este alumno ya forma parte de otro grupo en esta aula.');
          return;
        }
      }
      await this.materiaService.resolverSolicitudAcceso(g.id, solicitanteId, aprobar, uid);
      const actualizado = await this.materiaService.obtenerGrupo(g.id);
      if (actualizado) this.grupo.set(actualizado);
      await this.recargarLogs();
    } catch (e: any) {
      this.error.set(e.message ?? 'Error al procesar la solicitud');
    }
  }

  // ==== Perfiles legibles, vencimientos e historial ====

  nombreUsuario(id: string | null | undefined): string {
    if (!id) return '';
    return this.usuariosMap()[id] ?? `Usuario (${id.slice(0, 6)})`;
  }

  nombresAsignados(card: Card): string {
    const lista = (card.asignados ?? []).filter((a): a is string => !!a);
    if (lista.length === 0) return 'Sin asignar';
    return lista.map((id) => this.nombreUsuario(id)).join(', ');
  }

  esVencida(card: Card): boolean {
    if (!card.fechaLimite || card.estado === 'hecho') return false;
    const hoy = new Date().toISOString().slice(0, 10);
    return card.fechaLimite < hoy;
  }

  esProximaAVencer(card: Card): boolean {
    if (!card.fechaLimite || card.estado === 'hecho' || this.esVencida(card)) return false;
    const hoy = new Date();
    const limite = new Date(card.fechaLimite + 'T23:59:59');
    const diffDias = (limite.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24);
    return diffDias >= 0 && diffDias <= 2;
  }

  abrirHistorial() {
    this.mostrarModalLogs.set(true);
  }

  cerrarHistorial() {
    this.mostrarModalLogs.set(false);
  }

  logsOrdenados = computed(() => {
    return [...this.logs()]
      .filter((l) => l.accion !== 'registro_perfil')
      .sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));
  });

  describirLog(log: LogActividad): string {
    const mapa: Record<string, string> = {
      crear_card: 'creó una tarea',
      editar_card: 'editó una tarea',
      mover_card: 'cambió de columna una tarea',
      revisar_card: 'revisó una tarea',
      eliminar_card: 'eliminó una tarea',
      adjuntar_archivo: 'adjuntó un archivo',
      eliminar_adjunto: 'eliminó un adjunto',
      puntuar_card: 'calificó una tarea',
      evaluar_par: 'completó una evaluación de pares',
      editar_nombre: 'cambió el nombre del grupo',
      editar_integrantes: 'actualizó los integrantes del grupo',
      salir_grupo: 'salió del grupo',
      solicitar_acceso: 'solicitó unirse al grupo',
      aprobar_acceso: 'aceptó una solicitud de ingreso',
      rechazar_acceso: 'rechazó una solicitud de ingreso',
      calificar_grupo: 'calificó al grupo y sus integrantes',
    };
    return mapa[log.accion] ?? log.accion;
  }

  fechaLog(log: LogActividad): string {
    if (!log.timestamp) return '';
    const ms = log.timestamp < 1e12 ? log.timestamp * 1000 : log.timestamp;
    return new Date(ms).toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}