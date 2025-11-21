# Create Ignite JSON

Create json server and deploy it on cloudflare.

Created with 🧡 for front-end developers who need a quick back-end for deploying.


## Preview
![Ignite JSON Home Preview](https://repository-images.githubusercontent.com/1094416896/8b7ebdfd-6f0a-4e26-a5f6-f726f1c09cb0)

## Getting Started
Create a db.json file with some data
```json
{
  "books": [
    {
      "id": 1,
      "title": "Book Title 1",
      "downloads": 500
    },
    {
      "id": 2,
      "title": "Book Title 2",
      "downloads": 271
    }
  ],
  "profile": {
    "username": "almodheshplus",
    "languages": "AR, EN"
  },
  "sitename": "Ignite JSON"
}
```
Run `npx create-ignite-json` to deploy your db.json as a JSON Server on Cloudflare

## Routes
> **Note:** Routes and Params are inspired from `https://github.com/typicode/json-server`

Based on the example `db.json`, you'll get the following routes:

```
GET    /books
GET    /books/:id
POST   /books
PUT    /books/:id
PATCH  /books/:id
DELETE /books/:id
```

```
GET   /profile
PUT   /profile
PATCH /profile

# same for sitename
```

## Params

### Conditions

- ` ` → `==`
- `lt` → `<`
- `lte` → `<=`
- `gt` → `>`
- `gte` → `>=`
- `ne` → `!=`

```
GET /books?downloads_gt=9000
```

### Range

- `start`
- `end`
- `limit`

```
GET /books?_start=10&_end=20
GET /books?_start=10&_limit=10
```

### Paginate

- `page`
- `per_page` (default = 10)

```
GET /books?_page=1&_per_page=25
```

### Sort

- `_sort=f1,f2`

```
GET /books?_sort=id,-downloads
```

## Delete

```
DELETE /books/1
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