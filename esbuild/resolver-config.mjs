#!/usr/bin/env node
import glob from 'glob'

// options based on this: https://docs.aws.amazon.com/appsync/latest/devguide/resolver-reference-overview-js.html
export const resolverBuildOptions = () => ({
  logLevel: 'info',
  entryNames: '[dir]/[name]/index',
  bundle: true,
  sourcemap: 'inline',
  sourcesContent: false,
  target: 'esnext',
  platform: 'node',
  format: 'esm',
  external: ['@aws-appsync/utils'],
  outdir: 'dist',
})

export const resolverWatchOptions = () => ({
  ...buildOptions(),
})