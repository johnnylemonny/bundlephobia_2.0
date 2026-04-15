/**
 * treemap-squarify.js - open source implementation of squarified treemaps
 * 
 * Ported to TypeScript for Bundlephobia.
 */

class Container {
  xoffset: number
  yoffset: number
  width: number
  height: number

  constructor(xoffset: number, yoffset: number, width: number, height: number) {
    this.xoffset = xoffset
    this.yoffset = yoffset
    this.width = width
    this.height = height
  }

  shortestEdge(): number {
    return Math.min(this.height, this.width)
  }

  getCoordinates(row: number[]): number[][] {
    const coordinates: number[][] = []
    let subxoffset = this.xoffset
    let subyoffset = this.yoffset
    const areawidth = sumArray(row) / this.height
    const areaheight = sumArray(row) / this.width

    if (this.width >= this.height) {
      for (let i = 0; i < row.length; i++) {
        coordinates.push([
          subxoffset,
          subyoffset,
          subxoffset + areawidth,
          subyoffset + row[i] / areawidth,
        ])
        subyoffset = subyoffset + row[i] / areawidth
      }
    } else {
      for (let i = 0; i < row.length; i++) {
        coordinates.push([
          subxoffset,
          subyoffset,
          subxoffset + row[i] / areaheight,
          subyoffset + areaheight,
        ])
        subxoffset = subxoffset + row[i] / areaheight
      }
    }
    return coordinates
  }

  cutArea(area: number): Container {
    if (this.width >= this.height) {
      const areawidth = area / this.height
      const newwidth = this.width - areawidth
      return new Container(
        this.xoffset + areawidth,
        this.yoffset,
        newwidth,
        this.height
      )
    } else {
      const areaheight = area / this.width
      const newheight = this.height - areaheight
      return new Container(
        this.xoffset,
        this.yoffset + areaheight,
        this.width,
        newheight
      )
    }
  }
}

function normalize(data: number[], area: number): number[] {
  const sum = sumArray(data)
  const multiplier = area / sum
  return data.map(val => val * multiplier)
}

function sumArray(arr: number[]): number {
  return arr.reduce((sum, val) => sum + val, 0)
}

function calculateRatio(row: number[], length: number): number {
  const min = Math.min(...row)
  const max = Math.max(...row)
  const sum = sumArray(row)
  return Math.max(
    (Math.pow(length, 2) * max) / Math.pow(sum, 2),
    Math.pow(sum, 2) / (Math.pow(length, 2) * min)
  )
}

function improvesRatio(currentrow: number[], nextnode: number, length: number): boolean {
  if (currentrow.length === 0) {
    return true
  }

  const newrow = [...currentrow, nextnode]
  const currentratio = calculateRatio(currentrow, length)
  const newratio = calculateRatio(newrow, length)

  return currentratio >= newratio
}

function squarify(data: number[], currentrow: number[], container: Container, stack: number[][][]): number[][][] {
  if (data.length === 0) {
    stack.push(container.getCoordinates(currentrow))
    return stack
  }

  const length = container.shortestEdge()
  const nextdatapoint = data[0]

  if (improvesRatio(currentrow, nextdatapoint, length)) {
    const nextData = data.slice(1)
    const nextRow = [...currentrow, nextdatapoint]
    squarify(nextData, nextRow, container, stack)
  } else {
    const newcontainer = container.cutArea(sumArray(currentrow))
    stack.push(container.getCoordinates(currentrow))
    squarify(data, [], newcontainer, stack)
  }
  return stack
}

function flattenTreemap(rawtreemap: number[][][]): number[][] {
  const flattreemap: number[][] = []
  for (let i = 0; i < rawtreemap.length; i++) {
    for (let j = 0; j < rawtreemap[i].length; j++) {
      flattreemap.push(rawtreemap[i][j])
    }
  }
  return flattreemap
}

export default function treemapSingledimensional(
  data: number[],
  width: number,
  height: number,
  xoffset: number = 0,
  yoffset: number = 0
): number[][] {
  const rawtreemap = squarify(
    normalize(data, width * height),
    [],
    new Container(xoffset, yoffset, width, height),
    []
  )
  return flattenTreemap(rawtreemap)
}
