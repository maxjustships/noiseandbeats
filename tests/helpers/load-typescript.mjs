import { readFile, readdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

async function loadTypeScript() {
  try {
    return (await import('typescript')).default;
  } catch {
    const packageRoot = path.resolve('node_modules/.pnpm');
    const entry = (await readdir(packageRoot)).find((name) => name.startsWith('typescript@'));

    if (!entry) {
      throw new Error('TypeScript is not installed; run pnpm install first.');
    }

    const modulePath = path.join(packageRoot, entry, 'node_modules/typescript/lib/typescript.js');
    return (await import(pathToFileURL(modulePath).href)).default;
  }
}

export async function transpileTypeScriptFile(file, replacements = []) {
  const ts = await loadTypeScript();
  let source = await readFile(path.resolve(file), 'utf8');

  for (const [search, replacement] of replacements) {
    source = source.replace(search, replacement);
  }

  const { outputText, diagnostics = [] } = ts.transpileModule(source, {
    fileName: file,
    reportDiagnostics: true,
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  });

  const errors = diagnostics.filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error);
  if (errors.length > 0) {
    throw new Error(`Unable to transpile ${file}: ${errors.map(({ code }) => `TS${code}`).join(', ')}`);
  }

  return outputText;
}

export async function loadTypeScriptModule(file, replacements = []) {
  const outputText = await transpileTypeScriptFile(file, replacements);

  const encoded = Buffer.from(`${outputText}\n//# sourceURL=${file}`).toString('base64');
  return import(`data:text/javascript;base64,${encoded}#${Date.now()}-${Math.random()}`);
}
