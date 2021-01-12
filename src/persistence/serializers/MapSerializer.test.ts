import MapSerializer from "./MapSerializer"
import { createComplexMap, createSimpleMap, validateComplexMap, validateSimpleMap } from "./SerializerTestBase"

describe("MapSerializer", () => {
  it("can serialize empty map", () => {
    const serializer = new MapSerializer()

    const map = createSimpleMap()
    const serializedMap = serializer.serialize(map)
    const result = serializer.parse(serializedMap)

    validateSimpleMap(result)
  })

  it("can serialize complex map", () => {
    const map = createComplexMap()

    const serializer = new MapSerializer()
    const serializedMap = serializer.serialize(map)
    const result = serializer.parse(serializedMap)

    validateComplexMap(result)
  })
})
