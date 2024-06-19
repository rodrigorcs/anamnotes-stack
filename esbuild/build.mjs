#!/usr/bin/env node

import * as esbuild from 'esbuild'
import { lambdaBuildOptions } from './lambda-config.mjs'
import { resolverBuildOptions } from './resolver-config.mjs'

try {
  await esbuild.build(lambdaBuildOptions())
  await esbuild.build(resolverBuildOptions())
} catch (error) {
  console.error('[ERROR ESBUILD]', error)
  process.exit(1)
}

