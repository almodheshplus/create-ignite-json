#!/usr/bin/env node

import { downloadTemplate } from '@bluwy/giget-core';
import { spawn, type SpawnOptions } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from 'node:path';
import { exit, argv } from 'node:process';
import { createSpinner } from 'nanospinner';
import { input, confirm } from '@inquirer/prompts';
import pc from 'picocolors';

type KvData = { key: string, value: string }[];

const spawnPromise = async (command: string, args: readonly string[], options: SpawnOptions) => {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, options);
    if (args[0] != 'i' && !['create-db', 'push-db', 'cf-typegen'].some(v => v == args[1])) { // stop unnecessary output
      child.stdout?.on('data', (data) => {
        const output = data.toString();
        if (args[1] == 'deploy') {
          if (/^https(.+?)\.dev$/.test(output.trim())) {
            resolve(output);
          }
          return;
        }
        process.stdout.write('\n'+output);
      });
    }

    child.on('exit', (code) => {
      resolve();
    });
    child.on('close', (code) => {
      resolve();
    });
    child.on('error', (err) => {
      reject();
    });
  });
}

console.log(`
            ${pc.blue(pc.bold("I G N I T E ⚡"))}
            ${pc.blue(pc.bold("J S O N"))}
  ${pc.yellowBright("almodheshplus/create-ignite-json")}
`);

if (argv[2] == '--help' || argv[2] == '-h') {console.log('\nCommand: npx create-ignite-json\n');exit(0);}

const projectName = await input({
  message: 'Project Name',
  default: 'ignite-json',
  required: true,
  pattern: /^[\w-]+$/,
  patternError: 'can not include spaces or special charcters.',
  validate: (name) => {
    const projectExists = existsSync(name);
    return projectExists ? `This project name already exist, Use another name or delete [ ${name} ] folder to be able to use it.`: true;
  }
});

const JSONFileName = await input({
  message: 'JSON database file name',
  default: 'db.json',
  required: true,
  validate: (name) => {
    const projectExists = existsSync(name);
    return projectExists ? true: `File [ ${name} ] not found`;
  }
});

const askInstallDeps = await confirm({ message: 'Install dependencies automatically (npm will be used) ?' });

// Download ignite-json template from guthub
const downloadTemplateSpinner = createSpinner('Download ignite-json template').start();
await downloadTemplate(
  `gh:almodheshplus/ignite-json`,
  {
    dir: projectName,
    force: false,
  },
);
downloadTemplateSpinner.success();

// Convert json-server database to valid kv database
const prepareDbSpinner = createSpinner('Prepare Cloudflare Workers KV Database').start();
const jsonDB = readFileSync(JSONFileName, {
  encoding: 'utf8'
});
const parsedJsonDB = JSON.parse(jsonDB);
let KVDB: KvData = [];
Object.entries(parsedJsonDB).forEach(([key, value]) => {
  KVDB.push({key: key, value: JSON.stringify(value)});
});
const stringified_KVDB = JSON.stringify(KVDB);
writeFileSync(path.join(projectName, 'kv.json'), stringified_KVDB, {
  encoding: 'utf8'
});
prepareDbSpinner.success();

// install dependencies
if (!askInstallDeps) {
  console.log(`
  ${pc.bgYellow(pc.whiteBright('⚠  you will need to do it manualy'))}

  ${pc.magentaBright('Run the following commands to deploy ignite-json:')}
  > cd ${projectName}
  > npm i
  > npm run login
  > npm run create-db ${projectName}
  > npm run cf-typegen
  > npm run push-db
  > npm run deploy ${projectName}
   `);
  exit(0);
}

let spawnOptions: SpawnOptions = {
  cwd: projectName,
  stdio: ['inherit', 'pipe', 'pipe'],
  shell: true
};

const installDepsSpinner = createSpinner('Installing dependencies').start();
await spawnPromise('npm', ['i'], spawnOptions);
installDepsSpinner.success();

const cfLoginSpinner = createSpinner('Cloudflare Login').start();
await spawnPromise('npm', ['run', 'login'], spawnOptions);
cfLoginSpinner.success();

const KVCreateSpinner = createSpinner(`Create remote KV Database [ ${projectName} ]`).start();
await spawnPromise('npm', ['run', 'create-db', projectName], spawnOptions);
KVCreateSpinner.success();

const createTypes = createSpinner(`Create types for [ ${projectName} ], to be able to test it localy`).start();
await spawnPromise('npm', ['run', 'cf-typegen'], spawnOptions);
createTypes.success();

const pushDataSpinner = createSpinner(`Push data to remote KV Database [ ${projectName} ]`).start();
await spawnPromise('npm', ['run', 'push-db'], spawnOptions);
pushDataSpinner.success();

const deployProjectSpinner = createSpinner(`Deploy [ ${projectName} ] to Cloudflare Workers`).start();
await spawnPromise('npm', ['run', 'deploy', projectName], spawnOptions).then(url => {
  deployProjectSpinner.success();
  console.log(`
    ${pc.bgGreen(pc.white('Awesome! ✨'))}
    ${pc.bgMagentaBright(pc.white('Your JSON Server is ready 🥳'))}
    ${pc.greenBright('Link 🔗:')} ${pc.magentaBright(url as any)}`);
});

exit(0);