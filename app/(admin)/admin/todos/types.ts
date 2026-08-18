export type RawTodo = {
  id: string
  title: string
  done: boolean
  priority: 'high' | 'medium' | 'low'
  due_date: string | null
  created_at: string
  completed_at: string | null
  project_id: string | null
  projects: {
    id: string
    title: string
    clients:
      | {
          company_name: string | null
          contact_name: string | null
          profiles: { full_name: string | null } | { full_name: string | null }[] | null
        }
      | {
          company_name: string | null
          contact_name: string | null
          profiles: { full_name: string | null } | { full_name: string | null }[] | null
        }[]
      | null
  } | null
}

export type ProjectGroup = {
  id: string | null
  title: string
  company: string
  open: RawTodo[]
  done: RawTodo[]
}
