import type sharp from 'sharp';

type SharpModule = typeof sharp;

let sharpModulePromise: Promise<SharpModule> | undefined;

/** Lazy-load sharp for server routes (Vercel / Node). */
export async function getServerSharp(): Promise<SharpModule> {
  if (!sharpModulePromise) {
    sharpModulePromise = import('sharp').then((mod) => mod.default);
  }
  return sharpModulePromise;
}
