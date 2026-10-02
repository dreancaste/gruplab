import { Injectable } from '@angular/core';
import { getCurrentUser, fetchUserAttributes, signOut } from 'aws-amplify/auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _userId: string | null = null;
  private _email: string | null = null;

  async loadUser() {
    try {
      const user = await getCurrentUser();
      this._userId = user.userId;
      const attrs = await fetchUserAttributes();
      this._email = attrs['email'] ?? null;
      return { userId: this._userId, email: this._email };
    } catch {
      this._userId = null;
      this._email = null;
      return null;
    }
  }

  async getUserId(): Promise<string> {
    if (this._userId) return this._userId;
    const user = await this.loadUser();
    if (!user?.userId) throw new Error('No hay usuario autenticado');
    return user.userId;
  }

  async getEmail(): Promise<string | null> {
    if (this._email) return this._email;
    await this.loadUser();
    return this._email;
  }

  async logout() {
    await signOut();
  }
}