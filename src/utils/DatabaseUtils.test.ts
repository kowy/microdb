import DatabaseUtils from "./DatabaseUtils"
import { Selector } from "../dto/Filter"

describe("DatabaseUtils", () => {
  test("can add statistics to empty result", () => {
    const result = DatabaseUtils.addStatistics({ rows: [] })
    expect(result.offset).toEqual(0)
    expect(result.pageSize).toEqual(0)
    expect(result.totalRows).toEqual(0)
  })
  test("can add statistics", () => {
    const result = DatabaseUtils.addStatistics({
      rows: ["Peter's object", "Kamil's object", "My object"],
    })
    expect(result.offset).toEqual(0)
    expect(result.pageSize).toEqual(0)
    expect(result.totalRows).toEqual(3)
  })

  test("can accept empty selector and unknown filters", () => {
    shouldMatch({})
    shouldNotMatch({ lastName: { $a: "a" } })
    shouldMatch({ filter: { $b: "b", $a: "a" } })
  })
  test("can filter by exact value", () => {
    shouldMatch({ lastName: "Tyl" })
    shouldMatch({ firstName: "Kajetan", lastName: "Tyl" })
    shouldMatch({ nullable: null })
    shouldNotMatch({ lastName: "Smetana" })
    shouldNotMatch({ notExisting: "Any value" })
  })

  // test("can accept filter as function", () => {
  //   shouldMatch({ lastName: (value: string) => value.startsWith("T") })
  //   shouldNotMatch({
  //     lastName: (value: string) => {
  //       return value.endsWith("na")
  //     },
  //   })
  // })

  test("can filter by $eq operator", () => {
    shouldMatch({ lastName: { $eq: "Tyl" } })
    shouldMatch({ firstName: { $eq: "Kajetan" }, lastName: { $eq: "Tyl" } })
    shouldNotMatch({
      firstName: { $eq: "Kajetan" },
      lastName: { $eq: "Smetana" },
    })
    shouldMatch({
      firstName: { $eq: "Kajetan" },
      lastName: { $eq: "Tyl" },
      nullable: { $eq: null },
    })
    shouldNotMatch({ notExisting: { $eq: "Any value" } })
  })
  test("can filter by $ne operator", () => {
    shouldMatch({ lastName: { $ne: "Smetana" } })
    shouldMatch({ firstName: { $ne: "Bedrich" }, lastName: { $ne: "Smetana" } })
    shouldNotMatch({
      firstName: { $eq: "Kajetan" },
      lastName: { $eq: "Smetana" },
    })
    shouldMatch({
      firstName: { $eq: "Kajetan" },
      lastName: { $eq: "Tyl" },
      nullable: { $eq: null },
    })
    shouldNotMatch({ notExisting: { $eq: "Any value" } })
  })
  test("can filter by $gt operator", () => {
    shouldMatch({ lastName: { $gt: "Tyk" } })
    shouldMatch({ lastName: { $gt: "tyl" } })
    shouldNotMatch({ lastName: { $gt: "Tyl" } })
    shouldNotMatch({ lastName: { $gt: "Tyla" } })
    shouldMatch({ born: { $gt: 1800 } })
    shouldMatch({ born: { $gt: null } }) // null is considered as 0
    shouldNotMatch({ born: { $gt: 1808 } })
    shouldNotMatch({ born: { $gt: 1810 } })
  })
  test("can filter by $gte operator", () => {
    shouldMatch({ lastName: { $gte: "Tyl" } })
    shouldMatch({ lastName: { $gte: "Tyk" } })
    shouldMatch({ lastName: { $gte: "tyl" } })
    shouldNotMatch({ lastName: { $gte: "Tyla" } })
    shouldMatch({ born: { $gte: 1800 } })
    shouldMatch({ born: { $gte: 1808 } })
    shouldMatch({ born: { $gte: null } }) // null is considered as 0
    shouldNotMatch({ born: { $gte: 1810 } })
  })
  test("can filter by $lt operator", () => {
    shouldMatch({ lastName: { $lt: "Tym" } })
    shouldMatch({ lastName: { $lt: "Tyla" } })
    shouldNotMatch({ lastName: { $lt: "tyl" } })
    shouldNotMatch({ lastName: { $lt: "Tyl" } })
    shouldMatch({ born: { $lt: 1810 } })
    shouldNotMatch({ born: { $lt: 1808 } })
    shouldNotMatch({ born: { $lt: 1800 } })
    shouldNotMatch({ born: { $lt: null } }) // null is considered as 0
  })
  test("can filter by $lte operator", () => {
    shouldMatch({ lastName: { $lte: "Tyl" } })
    shouldMatch({ lastName: { $lte: "Tym" } })
    shouldMatch({ lastName: { $lte: "Tyla" } })
    shouldNotMatch({ lastName: { $lte: "tyl" } })
    shouldMatch({ born: { $lte: 1810 } })
    shouldMatch({ born: { $lte: 1808 } })
    shouldNotMatch({ born: { $lte: 1800 } })
    shouldNotMatch({ born: { $lte: null } }) // null is considered as 0
  })
  test("can filter by $in operator", () => {
    shouldMatch({ born: { $in: [1808] } })
    shouldMatch({ born: { $in: [1800, 1808] } })
    shouldMatch({ born: { $in: ["1800", 1808, "1900"] } })
    shouldNotMatch({ born: { $in: [1800, 1900] } })
    shouldMatch({ lastName: { $in: ["Tyl", "Smetana"] } })
    shouldNotMatch({ lastName: { $in: ["Smetana"] } })
    shouldNotMatch({ born: { $in: [null] } }) // null is considered as 0
    shouldMatch({ born: { $in: 1800 } }) // invalid in statements are ignored
    shouldMatch({ lastName: { $in: "Smetana" } }) // invalid in statements are ignored
  })
  test("can filter by $nin operator", () => {
    shouldNotMatch({ born: { $nin: [1808] } })
    shouldNotMatch({ born: { $nin: [1800, 1808] } })
    shouldNotMatch({ born: { $nin: ["1800", 1808, "1900"] } })
    shouldMatch({ born: { $nin: [1800, 1900] } })
    shouldNotMatch({ lastName: { $nin: ["Tyl", "Smetana"] } })
    shouldMatch({ lastName: { $nin: ["Smetana"] } })
    shouldMatch({ born: { $nin: [null] } }) // null is considered as 0
    shouldMatch({ born: { $nin: 1800 } }) // invalid in statements are ignored
    shouldMatch({ lastName: { $nin: "Smetana" } }) // invalid in statements are ignored
  })
  test("can filter by complex query", () => {
    shouldMatch({
      lastName: "Tyl",
      firstName: { $eq: "Kajetan" },
      nullable: { $in: [null, 5, "555"] },
      born: { $lte: 1900 },
    })
  })
})

function exampleRow() {
  return {
    id: 364,
    lastName: "Tyl",
    firstName: "Kajetan",
    nullable: null,
    born: 1808,
    filter: { $a: "a", $b: "b" },
  }
}
function shouldMatch(selector: Selector) {
  const row = exampleRow()
  const filters = DatabaseUtils.getFilterFunctions(selector)
  const result = DatabaseUtils.applyFilters(row, filters)
  if (!result) throw new Error(`checkShouldFind: selector ${JSON.stringify(selector)} does not match row ${JSON.stringify(row)}`)
}

function shouldNotMatch(selector: Selector) {
  const row = exampleRow()
  const filters = DatabaseUtils.getFilterFunctions(selector)
  const result = DatabaseUtils.applyFilters(row, filters)
  if (result)
    throw new Error(
      `checkShouldNotFind: selector ${JSON.stringify(selector)} match row ${JSON.stringify(row)} despite it shouldn't`
    )
}
