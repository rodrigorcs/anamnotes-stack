#!/usr/bin/env node
import glob from 'glob'
import esbuildPluginTsc from 'esbuild-plugin-tsc'
import fs from 'fs'

export const buildSymLinks = (sources) => {
  sources.forEach(({ sourceDir, sourceFile, targetDirs }) => {
    const fullDir = `${sourceDir}/${sourceFile}`

    targetDirs.forEach((targetDir) => {
      const fullTargetDir = `${targetDir}/${sourceFile}`

      fs.symlinkSync(fullDir, fullTargetDir, 'file')
    })
  })
}

export const lambdaEntry = () => glob.sync('./src/handlers/**/*.ts').reduce((acc, item) => {
  const path = item.split('/')
  const name = path.slice(2).join('/').split('.')[0] // This refers to each handler's dir without `.<extension>`

  acc[name] = item

  return acc
}, {})

const commonConfigs = (entryPoints) => ({
  logLevel: 'info',
  entryPoints,
  entryNames: '[dir]/[name]/index',
  resolveExtensions: ['.js', '.jsx', '.json', '.ts', '.tsx'],
  legalComments: 'none',
  external: ['aws-sdk'],
  keepNames: true,
  bundle: true,
  minify: true,
  minifyWhitespace: true,
  minifyIdentifiers: true,
  minifySyntax: true,
  sourcemap: true,
  sourcesContent: false,
  platform: 'node',
  target: 'node18',
  outdir: 'dist'
})

const tsconfigPath = './tsconfig.json'

export const lambdaBuildOptions = () => {
  const entryPoints = lambdaEntry()

  return {
    ...commonConfigs(entryPoints),  
    plugins: [
      esbuildPluginTsc({
        tsconfigPath,
      }),
    ]
  }
}

export const lambdaWatchOptions = () => {
  const entryPoints = lambdaEntry()

  return {
    ...commonConfigs(entryPoints),  
    minify: false,
    minifyWhitespace: false,
    minifyIdentifiers: false,
    minifySyntax: false,
    plugins: [
      esbuildPluginTsc({
        tsconfigPath,
      }),
    ]
  }
}