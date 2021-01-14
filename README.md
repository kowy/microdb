# MicroDB
[![Test Status](https://github.com/escapace/typescript-library-starter/workflows/Release/badge.svg?branch=master)](https://github.com/kowy/microdb/actions?query=workflow:Test+branch:master)
[![codecov](https://codecov.io/gh/kowy/microdb/branch/master/graph/badge.svg)](https://codecov.io/gh/kowy/microdb)
## :speech_balloon: Characteristics
* pure embedded database
* pure object database (objects are serialized to JSON directly in DB)
* suitable for electron or browser applications when you would like to avoid bulky full featured databases 
* suitable for limited datasets (not more than millions of rows)
* full database is stored in-memory and persisted to storage also (filestore or browser Local Storage)
* provides both sync & async interface   
* 100% Typescript code

## :package: Installation
In project root simply run:
```
yarn add --dev microdb
```
or
```
npm install --save-dev microdb
```
or add this row to `dependencies` section in package.json and apply changes:
```json
{
    "dependencies": {
        "microdb": "^0.1.0"
    }
}
```

## :hammer: Usage

## :heart: Big Thanks to 
* [lowdb](https://github.com/typicode/lowdb) - super simple and versatile JSON DB engine which strongly inspired me
* [PouchDb](https://pouchdb.com) - another super embedded JS DB, but do not provide sync interface
* [typescript-library-boilerplate](https://github.com/VitorLuizC/typescript-library-boilerplate) - this project is cooked from this boilerplate

## :seedling: Currently used by

## :book: License
Released under [MIT License](./LICENSE).
