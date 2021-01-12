import isEqual from "lodash/isEqual"
import { Selector, SelectorObject } from "../dto/Filter"
import StringUtils from "./StringUtils"

export function greaterThanFilter(row: any, attrName: string, condition: Selector): boolean {
  if (typeof row[attrName] === "string" && typeof condition.$gt === "string") {
    return StringUtils.localCompare(row[attrName], condition.$gt) > 0
  } else {
    const a = +row[attrName],
      b = +(condition.$gt ?? 0)
    return a > b
  }
}

export function greaterThanOrEqualFilter(row: any, attrName: string, condition: Selector): boolean {
  if (typeof row[attrName] === "string" && typeof condition.$gte === "string") {
    return StringUtils.localCompare(row[attrName], condition.$gte) >= 0
  } else {
    const a = +row[attrName],
      b = +(condition.$gte ?? 0)
    return a >= b
  }
}

export function lessThanFilter(row: any, attrName: string, condition: Selector): boolean {
  if (typeof row[attrName] === "string" && typeof condition.$lt === "string") {
    return StringUtils.localCompare(row[attrName], condition.$lt) < 0
  } else {
    const a = +row[attrName],
      b = +(condition.$lt ?? 0)
    return a < b
  }
}

export function lessThanOrEqualFilter(row: any, attrName: string, condition: Selector): boolean {
  if (typeof row[attrName] === "string" && typeof condition.$lte === "string") {
    return StringUtils.localCompare(row[attrName], condition.$lte) <= 0
  } else {
    const a = +row[attrName],
      b = +(condition.$lte ?? 0)
    return a <= b
  }
}

export function inFilter(row: any, attrName: string, condition: SelectorObject): boolean {
  return condition.$in?.some((possibleValue: any) => isEqual(row[attrName], possibleValue)) ?? false
}

export function ninFilter(row: any, attrName: string, condition: SelectorObject): boolean {
  return condition.$nin?.every((possibleValue: any) => !isEqual(row[attrName], possibleValue)) ?? false
}
