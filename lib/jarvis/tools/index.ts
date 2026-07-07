import type { ToolRegistry } from '../tool-types'
import { clientTools } from './clients'
import { projectTools } from './projects'
import { productTools } from './products'
import { akquiseTools } from './akquise'
import { financeTools } from './finance'
import { documentTools } from './documents'
import { knowledgeTools } from './knowledge'
import { integrationTools } from './integrations'
import { subagentTools } from './subagents'
import { todoTools } from './todos'

export const toolRegistry: ToolRegistry = new Map(
  [
    ...clientTools,
    ...projectTools,
    ...productTools,
    ...akquiseTools,
    ...financeTools,
    ...documentTools,
    ...knowledgeTools,
    ...integrationTools,
    ...subagentTools,
    ...todoTools,
  ].map((tool) => [tool.name, tool])
)
