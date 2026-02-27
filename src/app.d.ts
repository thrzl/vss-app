import type { User } from "$lib/schema";

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
  namespace App {
    interface Locals {
      user: User | null;
    }

    interface PageData {
      user: User | null;
    }

    // interface Error {}
    // interface PageState {}
    interface Platform {
      env: {
        DATABASE: D1Database;
        JWT_SECRET: string;
      };
    }
  }
}

export {};
