# Create Ignite JSON

Create and deploy a json server that can run on cloudflare workers.

## Preview
![Ignite JSON Home Preview](https://repository-images.githubusercontent.com/1094416896/8b7ebdfd-6f0a-4e26-a5f6-f726f1c09cb0)

## Quick Start

```bash
npx create-ignite-json
```

## Command line
> **Note:** you can just run `npx create-ignite-json` without any options

Run `npx create-ignite-json -h` for help
```text
Usage: create-ignite-json|ignite-json [options]

Create a json server and deploy it to cloudflare.

Options:
  -V, --version                     output the version number
  -n, --project-name <string>       project name [ used for folder name and KV database name ]
  -j, --json-db <path>              JSON database file path
  -i, --install-deps <yes|no>       install dependencies automatically (choices: "yes", "no")
  --pm, --package-manager <string>  package manager to use
  -h, --help                        display help for command
```

## Author

Almodhesh Plus <https://github.com/almodheshplus>