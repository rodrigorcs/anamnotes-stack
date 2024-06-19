#!/usr/bin/env node
import * as esbuild from 'esbuild'
import * as chokidar from 'chokidar'
import { lambdaWatchOptions, lambdaEntry, buildSymLinks } from './lambda-config.mjs'
import { resolverBuildOptions } from './resolver-config.mjs'
import { exec } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const watchDirectories = ['./src/**/*.ts', './src/**/*.prisma']

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const linkFiles = () => {
  const sources = [
    {
      sourceDir: `${__dirname}/../src/graphql`,
      sourceFile: 'appsync.graphql',
      targetDirs: [`${__dirname}/../dist/`],
    },
    {
      sourceDir: `${__dirname}/../src/graphql`,
      sourceFile: 'schema.graphql',
      targetDirs: [`${__dirname}/../dist/`],
    },
    {
      sourceDir: `${__dirname}/../node_modules/.prisma/client`,
      sourceFile: 'schema.prisma',
      targetDirs: Object.keys(lambdaEntry()).map((dir) => `${__dirname}/../dist/${dir}`),
    },
    {
      sourceDir: `${__dirname}/../node_modules/.prisma/client`,
      sourceFile: 'libquery_engine-rhel-openssl-1.0.x.so.node',
      targetDirs: Object.keys(lambdaEntry()).map((dir) => `${__dirname}/../dist/${dir}`),
    },
  ]

  buildSymLinks(sources)
}

const rebuild = async () => {
  try {
    const lambdaContext = await esbuild.context(lambdaWatchOptions())

    await lambdaContext.rebuild()
    await lambdaContext.dispose()
  } catch (error) {
    console.error(error)
  }

  try {
    const resolverContext = await esbuild.context(resolverBuildOptions())

    await resolverContext.rebuild()
    await resolverContext.dispose()
  } catch (error) {
    console.error(error)
  }
}

const runWatchApp = () =>
  exec(`. ./esbuild/watch-app.sh`, (error, stdOut, stdErr) => {
    if (error) {
      console.log('\t')
      console.error(error)
    } else {
      console.log('Success!')
    }
  })

try {
  const watcher = chokidar.watch(watchDirectories, {
    ignoreInitial: true, // We don't want resynth to take place for every single initial file change
  })

  // Reference: https://bilalbudhani.com/chokidar-esbuild/
  watcher.on('ready', async (event, path) => {
    console.log('Initial scan complete')

    await rebuild()

    console.log('creating symlinks for static files...')

    linkFiles() // only required once

    console.log('Ready for changes. Synthisizing CDK template')

    runWatchApp()
  })

  watcher.on('all', async (event, path) => {
    console.log(`Rebuilding ${path}`)

    await rebuild()

    console.log('Resynthizing CDK template')

    runWatchApp()
  })
} catch (error) {
  console.error(error)
}
