import fs from "fs"
import MicroDb from "../src/MicroDb"
import datawell from "./tests/DataWell"
import del from "del"

beforeAll(() => {
  del.sync(["./db/**", "./db"])
  del.sync(["./customPath/**", "./customPath"])
})

test("Don't create instance with empty dbName", () => {
  expect(() => new MicroDb("", {})).toThrowError()
})

test("Can create DB in custom path", () => {
  const db = new MicroDb("customDb", { root: "./customPath" })
  db.upsert(datawell.simpleObject(), { consistent: true })
  const stats = fs.statSync("./customPath/customDb.json")

  expect(stats.isFile()).toBeTruthy()
})

test("Can load old data from DB", () => {
  const db = new MicroDb("switchOff", {})
  db.upsert(datawell.simpleObject(), { consistent: true })

  const db2 = new MicroDb("switchOff", {})
  const result = db2.findAll()

  expect(result.rows.length).toBe(1)
  expect(result.rows[0]).toMatchObject(datawell.simpleObject())
})

test("Can upsert multiple values", () => {
  // including statistics
  const db = new MicroDb("multipleValues", {})
  db.upsertAll(datawell.multipleObjects(), { consistent: true })

  const result = db.findAll()
  expect(result.pageSize).toBe(0)
  expect(result.offset).toBe(0)
  expect(result.totalRows).toBe(3)
  expect(result.rows.length).toBe(3)
  datawell.compareArrays(result.rows, datawell.multipleObjects())
})

test("Can update object by id", () => {
  const db = new MicroDb("modifyValue", {})
  const origin: any = db.upsert(datawell.simpleObject(), { consistent: true })

  const result1 = db.findAll()
  expect(result1.rows.length).toBe(1)
  const obj1 = result1.rows[0]
  expect(obj1.stringAttr).toBe(origin.stringAttr)
  expect(obj1.numberAttr).toBe(origin.numberAttr)
  expect(obj1.boolAttr).toBe(origin.boolAttr)
  expect(obj1.nullAttr).toBeNull()
  expect(obj1).toMatchObject(origin)

  // modify object and check upsert
  obj1.stringAttr = "Another string"
  obj1.numberAttr = 539
  obj1.boolAttr = true
  const modifiedObj: any = db.upsert(obj1, { consistent: true })

  const result2 = db.findAll()
  expect(result2.rows.length).toBe(1)
  const obj2 = result1.rows[0]
  expect(modifiedObj._id).toBe(origin._id)
  expect(obj2).toMatchObject(modifiedObj)
})

test("Can modify values by id", () => {
  const db = new MicroDb("modifyFunction", {})
  const originObjects: any = db.upsertAll(datawell.multipleObjects(), { consistent: true })

  // modify object by modify function
  const modifiedObject: any = db.modify(originObjects[0]._id, (row: any) => {
    row.stringAttr += " modified"
    row.numberAttr += 5
    return row
  })

  const result2 = db.findAll()
  expect(result2.rows.length).toBe(3)
  expect(result2.rows[1]).toMatchObject(originObjects[1])
  expect(result2.rows[2]).toMatchObject(originObjects[2])
  expect(result2.rows[0]).toMatchObject(modifiedObject)
  expect(result2.rows[0].stringAttr).toBe("String3 modified")
  expect(result2.rows[0].numberAttr).toBe(16)
})

test("Can find row by id", () => {
  const db = new MicroDb("rowById", {})
  const originObjects: any = db.upsertAll(datawell.multipleObjects(), { consistent: true })

  const foundObject = db.findById(originObjects[0]._id)
  expect(foundObject).toMatchObject(originObjects[0])

  const notFoundObject = db.findById(" non-existing ")
  expect(notFoundObject).toBeUndefined()

  const emptyString = db.findById("")
  expect(emptyString).toBeUndefined()
})

test("Can delete row by id", () => {
  const db = new MicroDb("deleteRowById", {})
  const originObjects: any = db.upsertAll(datawell.multipleObjects(), { consistent: true })

  db.deleteById(originObjects[0]._id)
  const afterDelete1 = db.findAll()
  expect(afterDelete1.totalRows).toBe(2)
  expect(afterDelete1.rows.length).toBe(2)

  db.deleteById(originObjects[1]._id)
  const afterDelete2 = db.findAll()
  expect(afterDelete2.totalRows).toBe(1)
  expect(afterDelete2.rows.length).toBe(1)
  expect(afterDelete2.rows[0]).toMatchObject(originObjects[2])

  db.deleteById(originObjects[2]._id)
  const afterDelete3 = db.findAll()
  expect(afterDelete3.totalRows).toBe(0)
  expect(afterDelete3.rows.length).toBe(0)

  const notFoundObject = db.findById(" non-existing ")
  expect(notFoundObject).toBeUndefined()

  const emptyString = db.findById("")
  expect(emptyString).toBeUndefined()
})

test("Can filter objects", () => {
  const db = new MicroDb("filter", {})
  const originObjects: any = db.upsertAll(datawell.multipleObjects(), { consistent: true })

  // test filtering by Selector and sorting by Sorter object
  const foundObjects = db.filter({
    selector: { boolAttr: { $eq: false } },
    sort: { numberAttr: "desc" },
  })

  expect(foundObjects.totalRows).toBe(2)
  expect(foundObjects.rows[0]).toMatchObject(originObjects[2])
  expect(foundObjects.rows[1]).toMatchObject(originObjects[0])

  // test filtering by function and sorting by attribute name (default ascending sorting)
  const foundByFunction = db.filter({
    selector: (a: any) => a.numberAttr >= 11,
    sort: "stringAttr",
  })
  expect(foundByFunction.totalRows).toBe(3)
  expect(foundByFunction.rows.length).toBe(3)
  expect(foundByFunction.rows[0]).toMatchObject(originObjects[2])
  expect(foundByFunction.rows[1]).toMatchObject(originObjects[1])
  expect(foundByFunction.rows[2]).toMatchObject(originObjects[0])

  // test filtering by value and sorting by comparator function
  const foundByValue = db.filter({
    selector: { anotherString: "good" },
    sort: (a: any, b: any) => {
      // sort by boolAttr, then by stringValue
      if (a.boolAttr && !b.boolAttr) {
        return -1
      } else if (!a.boolAttr && b.boolAttr) {
        return 1
      } else {
        const aValue: string = a.stringAttr
        const bValue: string = b.stringAttr
        return aValue.localeCompare(bValue)
      }
    },
  })
  expect(foundByValue.totalRows).toBe(3)
  expect(foundByValue.rows.length).toBe(3)
  expect(foundByValue.rows[0]).toMatchObject(originObjects[1])
  expect(foundByValue.rows[1]).toMatchObject(originObjects[2])
  expect(foundByValue.rows[2]).toMatchObject(originObjects[0])

  // test limiting
  const foundLimited = db.filter({
    selector: {},
    limit: 1,
  })
  expect(foundLimited.totalRows).toBe(1)
  expect(foundLimited.rows.length).toBe(1)

  // test overlapping limit
  const foundNonLimited = db.filter({
    selector: {},
    limit: 99,
  })
  expect(foundNonLimited.totalRows).toBe(3)
  expect(foundNonLimited.rows.length).toBe(3)
})
