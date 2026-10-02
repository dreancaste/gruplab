import { Injectable } from '@angular/core';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';

type Materia = Schema['Materia']['type'];
type Grupo = Schema['Grupo']['type'];

const client = generateClient<Schema>();

@Injectable({ providedIn: 'root' })
export class MateriaService {
  /**
   * Genera un código de invitación de 6 caracteres alfanuméricos en mayúsculas.
   */
  private generarCodigo(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let codigo = '';
    for (let i = 0; i < 6; i++) {
      codigo += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return codigo;
  }

  /**
   * Crea una nueva materia. El creador queda como admin automáticamente.
   */
  async crearMateria(nombre: string, descripcion: string, creadorId: string): Promise<Materia> {
    const { data, errors } = await client.models.Materia.create({
      nombre,
      descripcion,
      creadorId,
      admins: [creadorId],
      profesores: [],
      alumnos: [],
      codigoInvitacion: this.generarCodigo(),
    });
    if (errors?.length) throw new Error(errors[0].message);
    return data!;
  }

  /**
   * Devuelve todas las materias en las que el usuario participa (en cualquier rol).
   */
  async listarMisMaterias(userId: string): Promise<Materia[]> {
    const { data, errors } = await client.models.Materia.list();
    if (errors?.length) throw new Error(errors[0].message);

    return (data ?? []).filter(
      (m) =>
        m.creadorId === userId ||
        m.admins?.includes(userId) ||
        m.profesores?.includes(userId) ||
        m.alumnos?.includes(userId),
    );
  }

  /**
   * Devuelve el rol del usuario dentro de la materia, o null si no participa.
   */
  obtenerRol(materia: Materia, userId: string): 'admin' | 'profesor' | 'alumno' | null {
    if (materia.admins?.includes(userId)) return 'admin';
    if (materia.profesores?.includes(userId)) return 'profesor';
    if (materia.alumnos?.includes(userId)) return 'alumno';
    return null;
  }

  /**
   * Une a un alumno a una materia usando el código de invitación.
   */
  async unirseConCodigo(codigo: string, userId: string): Promise<Materia> {
    const { data, errors } = await client.models.Materia.list({
      filter: { codigoInvitacion: { eq: codigo.toUpperCase().trim() } },
    });
    if (errors?.length) throw new Error(errors[0].message);
    if (!data || data.length === 0) throw new Error('Código inválido');

    const materia = data[0];
    const yaEsAlumno = materia.alumnos?.includes(userId);
    const yaEsProfesor = materia.profesores?.includes(userId);
    const yaEsAdmin = materia.admins?.includes(userId);
    if (yaEsAlumno || yaEsProfesor || yaEsAdmin) {
      throw new Error('Ya estás inscripto en esta materia');
    }

    const { data: updated, errors: updateErrors } = await client.models.Materia.update({
      id: materia.id,
      alumnos: [...(materia.alumnos ?? []), userId],
    });
    if (updateErrors?.length) throw new Error(updateErrors[0].message);
    return updated!;
  }

  /**
   * Lista los grupos de una materia.
   */
  async listarGruposDeMateria(materiaId: string): Promise<Grupo[]> {
    const { data, errors } = await client.models.Grupo.list({
      filter: { materiaId: { eq: materiaId } },
    });
    if (errors?.length) throw new Error(errors[0].message);
    return data ?? [];
  }
  /**
   * Obtiene una materia por ID.
   */
  async obtenerMateria(materiaId: string): Promise<Materia | null> {
    const { data, errors } = await client.models.Materia.get({ id: materiaId });
    if (errors?.length) throw new Error(errors[0].message);
    return data ?? null;
  }

  /**
   * Crea un grupo nuevo dentro de una materia. El creador queda como admin del grupo.
   */
  async crearGrupo(materiaId: string, nombre: string, adminId: string): Promise<Grupo> {
    const { data, errors } = await client.models.Grupo.create({
      nombre,
      materiaId,
      adminId,
      integrantes: [adminId],
    });
    if (errors?.length) throw new Error(errors[0].message);
    return data!;
  }

  /**
   * Devuelve el grupo del usuario en una materia, o null si no está en ninguno.
   */
  async obtenerMiGrupo(materiaId: string, userId: string): Promise<Grupo | null> {
    const grupos = await this.listarGruposDeMateria(materiaId);
    return grupos.find((g) => g.integrantes?.includes(userId)) ?? null;
  }

  /**
   * Lista las cards de un grupo.
   */
  async listarCardsDeGrupo(grupoId: string) {
    const { data, errors } = await client.models.Card.list({
      filter: { grupoId: { eq: grupoId } },
    });
    if (errors?.length) throw new Error(errors[0].message);
    return data ?? [];
  }

  /**
   * Obtiene un grupo por ID.
   */
  async obtenerGrupo(grupoId: string): Promise<Grupo | null> {
    const { data, errors } = await client.models.Grupo.get({ id: grupoId });
    if (errors?.length) throw new Error(errors[0].message);
    return data ?? null;
  }

  /**
   * Actualiza los campos de un grupo (nombre e integrantes).
   */
  async actualizarGrupo(
    grupoId: string,
    cambios: { nombre?: string; integrantes?: string[] },
  ): Promise<Grupo> {
    const { data, errors } = await client.models.Grupo.update({
      id: grupoId,
      ...cambios,
    });
    if (errors?.length) throw new Error(errors[0].message);
    return data!;
  }

  /**
   * Elimina un grupo. Antes borra sus cards para no dejar huérfanas.
   */
  async eliminarGrupo(grupoId: string): Promise<void> {
    // Borrar cards del grupo
    const cards = await this.listarCardsDeGrupo(grupoId);
    for (const c of cards) {
      await client.models.Card.delete({ id: c.id });
    }
    // Borrar el grupo
    const { errors } = await client.models.Grupo.delete({ id: grupoId });
    if (errors?.length) throw new Error(errors[0].message);
  }

  /**
   * Dado un conjunto de userIds candidatos, devuelve los que ya están en otro
   * grupo de la misma materia (para bloquear la operación).
   */
  async alumnosEnOtroGrupo(
    materiaId: string,
    candidatos: string[],
    grupoIdExcluir?: string,
  ): Promise<string[]> {
    const grupos = await this.listarGruposDeMateria(materiaId);
    const ocupados = new Set<string>();
    for (const g of grupos) {
      if (grupoIdExcluir && g.id === grupoIdExcluir) continue;
      for (const uid of g.integrantes ?? []) {
        if (uid && candidatos.includes(uid)) ocupados.add(uid);
      }
    }
    return Array.from(ocupados);
  }
  // ==== Cards ====

  async crearCard(
    grupoId: string,
    titulo: string,
    estado: 'backlog' | 'progreso' | 'revision' | 'hecho' = 'backlog',
  ) {
    const { data, errors } = await client.models.Card.create({
      grupoId,
      titulo,
      estado,
      orden: Date.now(),
      adjuntos: [],
    });
    if (errors?.length) throw new Error(errors[0].message);
    return data!;
  }

  async actualizarCard(
    cardId: string,
    cambios: Partial<{
      titulo: string;
      descripcion: string;
      estado: 'backlog' | 'progreso' | 'revision' | 'hecho';
      orden: number;
      puntuacion: number;
      comentarioProfesor: string;
    }>,
  ) {
    const { data, errors } = await client.models.Card.update({
      id: cardId,
      ...cambios,
    });
    if (errors?.length) throw new Error(errors[0].message);
    return data!;
  }

  async eliminarCard(cardId: string) {
    const { errors } = await client.models.Card.delete({ id: cardId });
    if (errors?.length) throw new Error(errors[0].message);
  }

  // ==== Log de actividad ====

  async registrarLog(
    grupoId: string,
    usuarioId: string,
    accion: string,
    entidad: string,
    entidadId: string,
  ) {
    await client.models.LogActividad.create({
      grupoId,
      usuarioId,
      accion,
      entidad,
      entidadId,
      timestamp: Date.now(),
    });
  }

  async listarLogsDeGrupo(grupoId: string) {
    const { data, errors } = await client.models.LogActividad.list({
      filter: { grupoId: { eq: grupoId } },
    });
    if (errors?.length) throw new Error(errors[0].message);
    return data ?? [];
  }

    /**
   * Saca a un usuario del grupo.
   * - Si era el admin y hay más integrantes → el admin pasa al primero de la lista.
   * - Si era el último integrante → se elimina el grupo completo.
   * Devuelve true si el grupo fue eliminado.
   */
  async salirDeGrupo(grupoId: string, userId: string): Promise<{ eliminado: boolean }> {
    const grupo = await this.obtenerGrupo(grupoId);
    if (!grupo) throw new Error('Grupo no encontrado');

    const integrantesRestantes = (grupo.integrantes ?? [])
      .filter((i): i is string => !!i && i !== userId);

    if (integrantesRestantes.length === 0) {
      await this.eliminarGrupo(grupoId);
      return { eliminado: true };
    }

    const nuevoAdminId =
      grupo.adminId === userId ? integrantesRestantes[0] : grupo.adminId;

    const { errors } = await client.models.Grupo.update({
      id: grupoId,
      integrantes: integrantesRestantes,
      adminId: nuevoAdminId,
    });
    if (errors?.length) throw new Error(errors[0].message);

    return { eliminado: false };
  }
    // ==== Tableros independientes ====

  /**
   * Crea un tablero independiente (sin materia). El creador queda como admin.
   */
  async crearTableroIndependiente(nombre: string, adminId: string): Promise<Grupo> {
    const { data, errors } = await client.models.Grupo.create({
      nombre,
      adminId,
      integrantes: [adminId],
      codigoInvitacion: this.generarCodigo(),
      esIndependiente: true,
    });
    if (errors?.length) throw new Error(errors[0].message);
    return data!;
  }

  /**
   * Lista los tableros independientes en los que participa el usuario.
   */
  async listarMisTableros(userId: string): Promise<Grupo[]> {
    const { data, errors } = await client.models.Grupo.list();
    if (errors?.length) throw new Error(errors[0].message);
    return (data ?? []).filter(
      (g) =>
        g.esIndependiente === true &&
        (g.integrantes ?? []).some((i) => i === userId)
    );
  }

  /**
   * Une a un usuario a un tablero independiente con código.
   */
  async unirseATableroConCodigo(codigo: string, userId: string): Promise<Grupo> {
    const { data, errors } = await client.models.Grupo.list({
      filter: { codigoInvitacion: { eq: codigo.toUpperCase().trim() } },
    });
    if (errors?.length) throw new Error(errors[0].message);
    if (!data || data.length === 0) throw new Error('Código inválido');

    const tablero = data[0];
    const integrantes = tablero.integrantes ?? [];
    if (integrantes.includes(userId)) {
      throw new Error('Ya estás en este tablero');
    }

    const { data: updated, errors: updateErrors } = await client.models.Grupo.update({
      id: tablero.id,
      integrantes: [...integrantes, userId],
    });
    if (updateErrors?.length) throw new Error(updateErrors[0].message);
    return updated!;
  }

    /**
   * Elimina una materia completa con sus grupos y cards en cascada.
   * Solo debería invocarse desde la UI si el usuario es admin.
   */
  async eliminarMateria(materiaId: string): Promise<void> {
    // Borrar todos los grupos (que ya borran sus cards)
    const grupos = await this.listarGruposDeMateria(materiaId);
    for (const g of grupos) {
      await this.eliminarGrupo(g.id);
    }
    // Borrar la materia
    const { errors } = await client.models.Materia.delete({ id: materiaId });
    if (errors?.length) throw new Error(errors[0].message);
  }
}
