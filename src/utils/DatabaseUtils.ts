import { FilterResponse, isMatcherFunction, isSelectorObject, MatcherFunction, Selector, SelectorObject } from "../dto/Filter"
import isEqual from "lodash/isEqual"
import * as f from "./FilterUtils"

export default class DatabaseUtils {
  public static addStatistics(result: FilterResponse<any>): FilterResponse<any> {
    result.offset = 0
    result.pageSize = 0 // this means all items
    result.totalRows = result.rows.length
    return result
  }

  public static getFilterFunctions(selector: MatcherFunction | Selector): ((row: any) => boolean)[] {
    // first check whether row is object. If not, no other checks has reason
    let result = [
      (row: any) => {
        return typeof row === "object"
      },
    ]

    if (isMatcherFunction(selector)) {
      result.push(selector)
    } else {
      Object.keys(selector)
        .map((attrName) => {
          const attrValue = selector[attrName]
          // if (typeof attrValue === "function") {
          //   const attrFunction: (a: any) => boolean = attrValue
          //   return [(row: any) => attrFunction(row[attrName])]
          // }
          if (isSelectorObject(attrValue)) {
            return this.filterBySelectorObject(attrName, attrValue)
          }
          return [
            (row: any) => {
              return isEqual(row[attrName], attrValue)
            },
          ]
        })
        .forEach((func) => {
          result = result.concat(func)
        })
    }

    return result
  }

  /**
   * Go through all filterFunctions, apply them to provided row. If all of provided filterFunctions result to TRUE,
   * return TRUE. Otherwise return FALSE
   * @param row
   * @param filterFunctions
   */
  public static applyFilters(row: any, filterFunctions: ((row: any) => boolean)[]): boolean {
    return filterFunctions.map((func) => func(row)).reduce((acc, filterResult) => acc && filterResult)
  }

  private static filterBySelectorObject(attrName: string, condition: SelectorObject): ((row: any) => boolean)[] {
    const result = []
    if (typeof condition.$eq !== "undefined") {
      result.push((row: any) => isEqual(row[attrName], condition.$eq))
    }
    if (typeof condition.$ne !== "undefined") {
      result.push((row: any) => !isEqual(row[attrName], condition.$ne))
    }
    if (typeof condition.$gt !== "undefined") {
      result.push((row: any) => f.greaterThanFilter(row, attrName, condition))
    }
    if (typeof condition.$gte !== "undefined") {
      result.push((row: any) => f.greaterThanOrEqualFilter(row, attrName, condition))
    }
    if (typeof condition.$lt !== "undefined") {
      result.push((row: any) => f.lessThanFilter(row, attrName, condition))
    }
    if (typeof condition.$lte !== "undefined") {
      result.push((row: any) => f.lessThanOrEqualFilter(row, attrName, condition))
    }
    if (typeof condition.$in !== "undefined" && Array.isArray(condition.$in)) {
      result.push((row: any) => f.inFilter(row, attrName, condition))
    }
    if (typeof condition.$nin !== "undefined" && Array.isArray(condition.$nin)) {
      result.push((row: any) => f.ninFilter(row, attrName, condition))
    }

    if (result.length == 0) {
      console.log(`Unknown condition ${JSON.stringify(condition)} for attribute ${attrName}`)
    }

    return result
  }
}
