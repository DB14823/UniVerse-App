// expo/src/winter/installGlobal.ts installs lazy getters for several globals
// (TextDecoder, TextDecoderStream, TextEncoderStream, structuredClone) that
// load runtime.native.ts when first accessed.  runtime.native.ts uses
// `import.meta` which jest-runtime throws on outside test module scope.
// Fix: eagerly evaluate each getter NOW (module loading is still allowed in
// setupFiles) and replace the getter with a plain value so later accesses
// during jest teardown don't re-trigger the load.

const EXPO_LAZY_GLOBALS = [
  "__ExpoImportMetaRegistry",
  "TextDecoder",
  "TextDecoderStream",
  "TextEncoderStream",
  "structuredClone",
];

for (const name of EXPO_LAZY_GLOBALS) {
  const desc = Object.getOwnPropertyDescriptor(global, name);
  if (desc && desc.get) {
    try {
      // Trigger the getter while module loading is still permitted
      const value = desc.get.call(global);
      Object.defineProperty(global, name, {
        value,
        writable: true,
        configurable: true,
        enumerable: false,
      });
    } catch {
      // If the getter itself fails, stub it with a no-op so it never
      // triggers the problematic require again.
      Object.defineProperty(global, name, {
        value:
          name === "structuredClone"
            ? (v) => JSON.parse(JSON.stringify(v))
            : {},
        writable: true,
        configurable: true,
        enumerable: false,
      });
    }
  }
}
