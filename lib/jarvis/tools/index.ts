import type { ToolRegistry } from '../tool-types'
import { clientTools } from './clients'
import { projectTools } from './projects'
import { productTools } from './products'
import { akquiseTools } from './akquise'

export const toolRegistry: ToolRegistry = new Map(
  [...clientTools, ...projectTools, ...productTools, ...akquiseTools].map((tool) => [tool.name, tool])
)
