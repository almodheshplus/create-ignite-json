#!/usr/bin/env node

import { downloadTemplate } from '@bluwy/giget-core';
import { spawn, type SpawnOptions } from 'node:child_process';
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import path from 'node:path';
import { createSpinner } from 'nanospinner';
import { input, confirm, select } from '@inquirer/prompts';
import pc from 'picocolors';
import { Option, program, InvalidArgumentError } from 'commander';
import packageJson  from '../package.json' with { type: 'json' };

// define types
type KvData = { key: string, value: string }[];
type PackageManager = 'npm' | 'bun' | 'pnpm' | 'yarn';

// define data vars
const knownPackageManagers: PackageManager[] = ['npm', 'bun', 'pnpm', 'yarn'];
const projectNamePattern = /^(?!-)[a-zA-Z0-9-]+(?<!-)$/;
const errorMessage = {
  projectNamePattern: 'Project Name must contain only letters, numbers, and dashes, and cannot start or end with a dash.',
  projectNameAlreadyExist: (name: string) => `Project name already exists. Choose a different name or delete the [ ${name} ] folder.`,
  noPackageManagerInstalled: 'There is no package managers found!, You must install one',
  fileNotFound: (filePath: string) => `File [ ${filePath} ] not found`,

}

// define functions
const checkPackageManagerInstalled = (packageManager: string) => {
  return new Promise<boolean>((resolve) => {
    const pm = spawn(packageManager, ['--version'], { shell: true });
    pm.on('close', (code) => {
      if (code === 0) { // means package manager is found
        resolve(true);
      }
      resolve(false);
    });
  });
}
const getCurrentPackageManager = (): PackageManager => {
  const agent = process.env.npm_config_user_agent || 'npm' // it might be undefined

  for (const pm of knownPackageManagers) {
    if (agent.startsWith(pm)) return pm;
  }

  return 'npm';
}
const installedPackageManagers = () => {
  return new Promise<PackageManager[]>((resolve) => {
    let allPromises: any[] = [];
    knownPackageManagers.forEach(pm => {
      allPromises.push(checkPackageManagerInstalled(pm));
    });

    Promise.all(allPromises).then(pms => {
      resolve(knownPackageManagers.filter((_, i) => pms[i]));
    });
  });
}
const spawnPromise = async (command: string, args: readonly string[], options: SpawnOptions) => {
  return new Promise<string | undefined>((resolve, reject) => {
    const child = spawn(command, args, options);
    if (args[0] != 'install' && !['create-db', 'push-db', 'cf-typegen'].some(v => v == args[1])) { // stop unnecessary output
      child.stdout?.on('data', (data) => {
        const output: string = data.toString();
        if (args[1] == 'deploy') {
          const urlMatch = output.match(/https.+\.dev/);
          if (urlMatch) {
            resolve(urlMatch[0]);
          }
          return;
        }
        if (args[1] == 'login') {
          if (output.includes('link to authenticate')) {
            process.stdout.write(`\n\n${pc.cyan(output)}\n`);
          }
          return;
        }

        process.stdout.write('\n'+output);
      });
    }

    child.stderr?.on('data', (err) => {        
      reject(`${pc.redBright(`\nUnexpected error happend with [ ${pc.bold(`${command} ${args.join(' ')}`)} ] command`)}\n${pc.yellowBright('Error Details:')}\n${pc.gray(err)}`);
    });
    child.on('close', (code) => {
      resolve(undefined);
    });
    child.on('error', (err) => {
      reject(pc.redBright(`\nUnexpected error happend when running [ ${pc.bold(`${command} ${args.join(' ')}`)} ]`));
    });
  });
}
const yesNoToBoolean = (answer: string | boolean | undefined): boolean | undefined => {
  if (typeof answer == 'boolean') return answer;
  return answer === undefined ? undefined: (answer == 'yes' ? true: false);
}
const jsonToKv = (projectName: string, jsonDbPath: string, kvDbPath: string = 'kv.json'): void => {
  const jsonDB = readFileSync(jsonDbPath, {
    encoding: 'utf8'
  });
  const parsedJsonDB = JSON.parse(jsonDB);
  Object.entries(parsedJsonDB).forEach(([key, value]) => {
    KVDB.push({key: key, value: JSON.stringify(value)});
  });
  const stringified_KVDB = JSON.stringify(KVDB);
  writeFileSync(path.join(projectName, kvDbPath), stringified_KVDB, {
    encoding: 'utf8'
  });
}

// define let vars
let chosenPackageManager = getCurrentPackageManager();
let availablePackageManagers: PackageManager[] = await installedPackageManagers();
let KVDB: KvData = [];

// create CLI
program
  .name('create-ignite-json')
  .alias('ignite-json')
  .description(packageJson.description)
  .version(packageJson.version);
program.option('-n, --project-name <string>', 'project name [ used for folder name and KV database name ]', (name) => {
  // check project name pattern
  if (!projectNamePattern.test(name)) throw new InvalidArgumentError(errorMessage.projectNamePattern);
  if (existsSync(name)) throw new InvalidArgumentError(errorMessage.projectNameAlreadyExist(name));
  return name;
});
program.option('-j, --json-db <path>', 'JSON database file path', (filePath) => {
  if (!existsSync(filePath)) throw new InvalidArgumentError(errorMessage.fileNotFound(filePath));
  return filePath;
});
program.addOption(new Option('-i, --install-deps <yes|no>', 'install dependencies automatically').choices(['yes', 'no']).argParser((answer) => {  
  if (availablePackageManagers.length == 0) throw new InvalidArgumentError(errorMessage.noPackageManagerInstalled);
  return answer;
}));
program.addOption(new Option('--pm, --package-manager <string>', 'package manager to use').choices(availablePackageManagers).implies({ installDeps: true }));

program.parse();

const cmdOptions = program.opts();

console.log(`
            ${pc.blue(pc.bold("I G N I T E ⚡"))}
            ${pc.blue(pc.bold("J S O N"))}
  ${pc.magentaBright("Run: [ create-ignite-json -h ] for help")}
  ${pc.yellowBright("almodheshplus/create-ignite-json")}
`);

// program logic
const projectName = cmdOptions.projectName ?? await input({
  message: 'Project Name',
  default: 'ignite-json',
  required: true,
  pattern: projectNamePattern,
  patternError: errorMessage.projectNamePattern,
  validate: (name) => {
    const projectExists = existsSync(name);
    return projectExists ? errorMessage.projectNameAlreadyExist(name): true;
  }
});
if (cmdOptions.projectName) console.log(`✔ ${pc.cyan(`Project Name:`)} ${pc.greenBright(cmdOptions.projectName)}`);

const JSONFileName = cmdOptions.jsonDb ?? await input({
  message: 'JSON database file path',
  default: 'db.json',
  required: true,
  validate: (filePath) => {
    const projectExists = existsSync(filePath);
    return projectExists ? true: errorMessage.fileNotFound(filePath);
  }
});
if (cmdOptions.jsonDb) console.log(`✔ ${pc.cyan(`JSON database file path:`)} ${pc.greenBright(cmdOptions.jsonDb)}`);

const askInstallDeps = yesNoToBoolean(cmdOptions.installDeps) ?? await confirm({ message: 'Install dependencies automatically?' });
if (cmdOptions.installDeps) console.log(`✔ ${pc.cyan(`Install dependencies automatically:`)} ${pc.greenBright('Yes')}`);

// Ask for package manager to use
if (askInstallDeps) {
  if (availablePackageManagers.length == 0) throw new Error(errorMessage.noPackageManagerInstalled);
  chosenPackageManager = cmdOptions.packageManager ?? await select({
    message: 'Choose package manager',
    default: chosenPackageManager,
    choices: availablePackageManagers.map(pm => {
      return { name: pm, value: pm };
    })
  });
  if (cmdOptions.packageManager) console.log(`✔ ${pc.cyan(`Package Manager:`)} ${pc.greenBright(chosenPackageManager)}`);
}

// Download ignite-json template from guthub
const downloadTemplateSpinner = createSpinner('Download ignite-json template').start();
await downloadTemplate(
  `gh:almodheshplus/ignite-json`,
  {
    dir: projectName,
    force: false,
  },
);
downloadTemplateSpinner.success({ text: `ignite-json template downloaded successfully, [ ${projectName} ] directory has been created` });

// Convert json-server database to valid kv database
const prepareDbSpinner = createSpinner('Prepare Cloudflare Workers KV Database').start();
jsonToKv(projectName, JSONFileName);
prepareDbSpinner.success();

// User need to do installation process manualy
if (!askInstallDeps) {
  console.log(`
  ${pc.bgYellow(pc.whiteBright('⚠  you will need to do it manualy'))}

  ${pc.magentaBright('Run the following commands to deploy ignite-json:')}
  > cd ${projectName}
  > ${chosenPackageManager} install
  > ${chosenPackageManager} run login
  > ${chosenPackageManager} run create-db ${projectName}
  > ${chosenPackageManager} run cf-typegen
  > ${chosenPackageManager} run push-db
  > ${chosenPackageManager} run deploy ${projectName}
   `);
  process.exit(0);
}

let spawnOptions: SpawnOptions = {
  cwd: projectName,
  stdio: ['inherit', 'pipe', 'pipe'],
  shell: true
};

function catchSpawnError(err: string) {
  console.log(err);
  process.exit(1);
}

const installDepsSpinner = createSpinner('Installing dependencies').start();
await spawnPromise(chosenPackageManager, ['install'], spawnOptions).catch(catchSpawnError);
installDepsSpinner.success({ text: 'Dependencies Installed' });

const cfLoginSpinner = createSpinner('Cloudflare login').start();
await spawnPromise(chosenPackageManager, ['run', 'login'], spawnOptions).catch(catchSpawnError);
cfLoginSpinner.success({ text: 'Successfully loggedin to Cloudflare' });

const KVCreateSpinner = createSpinner(`Create remote KV Database [ ${projectName} ]`).start();
await spawnPromise(chosenPackageManager, ['run', 'create-db', projectName], spawnOptions).catch(catchSpawnError);
KVCreateSpinner.success({ text: 'KV Database created successfully' });

const createTypes = createSpinner(`Create types for [ ${projectName} ], to be able to test it localy`).start();
await spawnPromise(chosenPackageManager, ['run', 'cf-typegen'], spawnOptions).catch(catchSpawnError);
createTypes.success();

const pushDataSpinner = createSpinner(`Push data to remote KV Database [ ${projectName} ]`).start();
await spawnPromise(chosenPackageManager, ['run', 'push-db'], spawnOptions).catch(catchSpawnError);
pushDataSpinner.success({ text: 'KV Database pushed to remote' });

const deployProjectSpinner = createSpinner(`Deploy [ ${projectName} ] to Cloudflare Workers`).start();
await spawnPromise(chosenPackageManager, ['run', 'deploy', projectName.toLowerCase()], spawnOptions).then(url => {
  if (url !== undefined) {
    deployProjectSpinner.success();
    console.log(`
      ${pc.bgGreen(pc.white('Awesome! ✨'))}
      ${pc.bgMagentaBright(pc.white('Your JSON Server is ready 🥳'))}
      ${pc.greenBright('Link 🔗:')} ${pc.magentaBright(url)}`);
      return;
    }

    deployProjectSpinner.warn({ text: 'Error happend during deployment process.' });
    console.log(`
      ${pc.bgYellowBright(pc.white('⚠ Maybe the JSON Server is deployed but we cannot get it\'s URL'))}
      ${pc.cyan('Check [ Workers & Pages ] section in Cloudflare dashboard you may find it there.')}`);
}).catch(catchSpawnError);

process.exit(0);