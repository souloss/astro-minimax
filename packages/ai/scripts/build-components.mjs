#!/usr/bin/env node
/**
 * Build script for @astro-minimax/ai components.
 * 
 * WHY: Components need to be pre-compiled to JavaScript with explicit `h()` calls
 * instead of relying on jsx-runtime transformation. This ensures they work correctly
 * when consumed via `file:` protocol (CLI-created blogs) where the bundler's JSX
 * transformation pipeline may not handle external packages correctly.
 * 
 * WHAT: Compiles TSX files to JS using esbuild with:
 * - `jsx: 'transform'` - Transform JSX to function calls
 * - `jsxFactory: 'h'` - Use Preact's `h()` function
 * - `jsxFragment: 'Fragment'` - Use Preact's Fragment
 * - Automatic import injection for `h` and `Fragment` from 'preact'
 */

import * as esbuild from 'esbuild';
import { readdir, mkdir, writeFile, readFile } from 'fs/promises';
import { join, dirname, basename, extname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Go up one level from scripts/ to package root
const packageRoot = join(__dirname, '..');
const srcDir = join(packageRoot, 'src', 'components');
const outDir = join(packageRoot, 'dist', 'components');

// Components to build (TSX files only)
const COMPONENTS = ['ChatPanel.tsx', 'AIChatContainer.tsx'];

/**
 * Post-process the compiled JS to ensure proper imports.
 * - Add missing h/Fragment imports from preact
 * - Replace .ts imports with .js for ESM compatibility
 */
function postProcessCode(code) {
  // Replace .ts imports with .js (for local imports)
  code = code.replace(/from\s*['"](\.\.\/[^'"]+)\.ts['"]/g, 'from "$1.js"');
  
  // Check if h and Fragment are already imported
  const hasHImport = /import\s*\{[^}]*h[^}]*\}\s*from\s*['"]preact['"]/.test(code);
  const hasFragmentImport = /import\s*\{[^}]*Fragment[^}]*\}\s*from\s*['"]preact['"]/.test(code);
  
  // Check if h is used in the code
  const usesH = /\bh\(/.test(code);
  const usesFragment = /Fragment\b/.test(code);
  
  // Build the import statement if needed
  if ((usesH && !hasHImport) || (usesFragment && !hasFragmentImport)) {
    const imports = [];
    if (usesH && !hasHImport) imports.push('h');
    if (usesFragment && !hasFragmentImport) imports.push('Fragment');
    
    // Find the first import statement to insert before
    const firstImportMatch = code.match(/^import\s/m);
    if (firstImportMatch) {
      const insertPos = firstImportMatch.index;
      const importStmt = `import { ${imports.join(', ')} } from 'preact';\n`;
      return code.slice(0, insertPos) + importStmt + code.slice(insertPos);
    } else {
      // No imports found, add at the top
      return `import { ${imports.join(', ')} } from 'preact';\n\n` + code;
    }
  }
  
  return code;
}

async function buildComponents() {
  // Ensure output directory exists
  await mkdir(outDir, { recursive: true });

  for (const component of COMPONENTS) {
    const srcPath = join(srcDir, component);
    const outJsName = component.replace('.tsx', '.js');
    const outDtsName = component.replace('.tsx', '.d.ts');
    const outJsPath = join(outDir, outJsName);

    console.log(`Building ${component}...`);

    // Build with esbuild
    const result = await esbuild.build({
      entryPoints: [srcPath],
      outfile: outJsPath,
      format: 'esm',
      platform: 'browser',
      target: 'es2022',
      bundle: false,
      jsx: 'transform',
      jsxFactory: 'h',
      jsxFragment: 'Fragment',
      // Use our custom tsconfig that doesn't have jsxImportSource
      tsconfig: join(packageRoot, 'tsconfig.components.json'),
      sourcemap: false,
      minify: false,
    });

    // Post-process to ensure imports are correct
    let code = await readFile(outJsPath, 'utf-8');
    code = postProcessCode(code);
    await writeFile(outJsPath, code, 'utf-8');

    console.log(`  -> ${outJsPath}`);
  }

  // Copy the Astro component as-is (it doesn't need compilation)
  const astroSrc = join(srcDir, 'AIChatWidget.astro');
  const astroOut = join(outDir, 'AIChatWidget.astro');
  const astroCode = await readFile(astroSrc, 'utf-8');
  await writeFile(astroOut, astroCode, 'utf-8');
  console.log(`Copied AIChatWidget.astro -> ${astroOut}`);

  console.log('Component build complete!');
}

buildComponents().catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});