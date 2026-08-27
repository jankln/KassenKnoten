/**
 * The trained-model packages ship no types.
 *
 * What they export is three fields, and only `langPath` is used here — it is the one
 * value that survives bundling, because the package computes it from its own real
 * `__dirname` at runtime rather than from anything a bundler rewrites.
 */
declare module "@tesseract.js-data/deu" {
  const data: { code: string; gzip: boolean; langPath: string };
  export default data;
}

declare module "@tesseract.js-data/eng" {
  const data: { code: string; gzip: boolean; langPath: string };
  export default data;
}
