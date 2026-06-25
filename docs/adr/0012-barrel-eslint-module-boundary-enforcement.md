# Barrel index.ts + ESLint to enforce module boundaries

Each domain module exposes a public API via `src/<module>/index.ts`. ESLint `no-restricted-imports` rules make importing past the barrel (into `src/<module>/**` directly) a CI failure.

Barrels alone rely on discipline and erode silently under time pressure. The ESLint rule makes violations visible immediately in the editor and blocking in CI. Together they give the modular monolith architecture actual teeth — without them, "modular" is just a folder convention that collapses when someone takes a shortcut.

The alternative (barrel-only, no lint rule) was rejected because past experience shows these conventions degrade without mechanical enforcement.
