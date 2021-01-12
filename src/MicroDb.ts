import { v4 as uuidv4 } from "uuid"
import JSONFileSync from "./persistence/adapters/JSONFileSync"
import MemorySync from "./persistence/adapters/MemorySync"
import { MicroDbOptions, ModificationOperationOptions } from "./dto/MicroDbOptions"
import Low from "./persistence/Low"
import MapSerializer from "./persistence/serializers/MapSerializer"
import FileUtils from "./utils/FileUtils"
import DatabaseUtils from "./utils/DatabaseUtils"
import { FilterRequest, FilterResponse, SortRequest } from "./dto/Filter"

const DB_DIRECTORY = "./db"
const SAVE_CHECK_TIMETOUT_MS = 1000

export default class MicroDb {
  private dbName: string
  private memDb: Low<Map<string, any>>
  private db: Low<Map<string, any>>
  private isDirty = false
  private saveInProgress = false

  constructor(dbName: string, options: MicroDbOptions) {
    if (!dbName || dbName.trim() === "") throw Error("Parameter dbName is mandatory")

    const opts = { root: DB_DIRECTORY, ...options }
    this.dbName = dbName.trim()

    FileUtils.createDirectoryIfNotExists(opts.root)

    const serializer = new MapSerializer()
    const fileAdapter = new JSONFileSync(`${opts.root}/${this.dbName}.json`)
    this.db = new Low<Map<string, any>>(fileAdapter, serializer)

    const memAdapter = new MemorySync()
    this.memDb = new Low<Map<string, any>>(memAdapter, serializer)

    // sync data from HDD
    this.db.read()
    this.memDb.data = this.db.data
    this.memDb.write()
  }

  findAll(): FilterResponse<any> {
    const result: FilterResponse<any> = {
      rows: [...this.memDb.read().values()],
    }

    return DatabaseUtils.addStatistics(result)
  }

  findById(id: string): unknown {
    if (!id || id.trim() === "") return undefined

    return this.memDb.read().get(id)
  }

  filter(request: FilterRequest): FilterResponse<any> {
    const filterFunctions = DatabaseUtils.getFilterFunctions(request.selector)
    const rows = [...this.memDb.read().values()].filter((row) => DatabaseUtils.applyFilters(row, filterFunctions))
    const result: FilterResponse<any> = { rows: rows }

    // apply sorting if set in request
    if (request.sort && result.rows.length > 0) {
      const sorter = MicroDb.createSortComparator(rows, request.sort)
      result.rows = result.rows.sort(sorter)
    }

    // apply limit if set in request
    if (request.limit && Number.isSafeInteger(request.limit)) {
      result.rows = result.rows.slice(0, request.limit)
    }

    return DatabaseUtils.addStatistics(result)
  }

  upsert(row: any, options?: ModificationOperationOptions): unknown {
    const opts = { consistent: false, ...options }
    const _id = row._id ? row._id : uuidv4()
    row._id = _id

    this.memDb.data.set(_id, row)

    this._sync(opts.consistent)

    return row
  }

  upsertAll(rows: any[], options?: ModificationOperationOptions): Array<unknown> {
    const opts = { consistent: false, ...options }

    const updatedRows = rows.map((row) => this.upsertOneRow(row))

    this._sync(opts.consistent)

    return updatedRows
  }

  modify(id: string, modificatorFunction: (a: any) => any, options?: ModificationOperationOptions): unknown {
    if (!this.memDb.data.has(id)) return null

    const opts = { consistent: false, ...options }
    const updatedRow = modificatorFunction(Object.assign({}, this.memDb.data.get(id)))
    // the user might change the id, so repair it
    updatedRow.id = id
    this.memDb.data.set(id, updatedRow)

    this._sync(opts.consistent)

    return updatedRow
  }

  deleteById(id: string, options?: ModificationOperationOptions): boolean {
    const opts = { consistent: false, ...options }

    const result = this.memDb.data.delete(id)

    this._sync(opts.consistent)
    return result
  }

  private upsertOneRow(row: any): unknown {
    const _id = row._id ? row._id : uuidv4()
    row._id = _id

    this.memDb.data.set(_id, Object.assign({}, row))
    return row
  }

  private static createSortComparator(rows: any[], sorter: SortRequest): (a: any, b: any) => number {
    let result: (a: any, b: any) => number

    if (typeof sorter === "function") {
      result = sorter
    } else {
      const sortAttr: string = typeof sorter === "string" ? sorter : Object.keys(sorter)[0]
      const sortDirection: string = typeof sorter === "string" ? "asc" : sorter[sortAttr]
      if (sortDirection === "desc") {
        if (typeof rows[0][sortAttr] === "number") {
          result = (a: any, b: any) => b[sortAttr] - a[sortAttr]
        } else if (typeof rows[0][sortAttr] === "boolean") {
          result = (a: any, b: any) => {
            if (a[sortAttr]) {
              if (b[sortAttr]) return 1
              return -1
            }

            if (b[sortAttr]) return 0
            return 1
          }
        } else if (typeof rows[0][sortAttr] === "string") {
          result = (a: any, b: any): number => {
            const aValue: string = a[sortAttr]
            const bValue: string = b[sortAttr]
            return bValue.localeCompare(aValue)
          }
        } else {
          result = (a: any, b: any): number => {
            if (a[sortAttr] === b[sortAttr]) return 0
            else if (a[sortAttr] > b[sortAttr]) return -1
            else return 1
          }
        }
      } else {
        if (typeof rows[0][sortAttr] === "number") {
          result = (a: any, b: any): number => a[sortAttr] - b[sortAttr]
        } else if (typeof rows[0][sortAttr] === "boolean") {
          result = (a: any, b: any): number => {
            if (a[sortAttr]) {
              if (b[sortAttr]) return 0
              return -1
            }

            if (b[sortAttr]) return 1
            return 0
          }
        } else if (typeof rows[0][sortAttr] === "string") {
          result = (a: any, b: any): number => {
            const aValue: string = a[sortAttr]
            const bValue: string = b[sortAttr]
            return aValue.localeCompare(bValue)
          }
        } else {
          result = (a: any, b: any): number => {
            if (a[sortAttr] === b[sortAttr]) return 0
            else if (a[sortAttr] > b[sortAttr]) return 1
            else return -1
          }
        }
      }
    }

    return result
  }

  private _sync(consistent: boolean) {
    this.memDb.write()
    this.isDirty = true

    if (consistent) {
      this._doSync()
    } else {
      Promise.resolve(() => {
        this._doSync()
      }).catch((reason: any) => {
        console.log(reason)
      })
    }
  }

  private _doSync() {
    if (!this.isDirty) return

    if (this.saveInProgress) {
      setTimeout(() => this._doSync(), SAVE_CHECK_TIMETOUT_MS)
    } else {
      this.saveInProgress = true
      this.db.data = this.memDb.data
      this.db.write()
      this.isDirty = false
      this.saveInProgress = false
    }
  }
}
