import type * as financeDomain from '@/lib/domain/finance'

export type InvoiceRow = Awaited<ReturnType<typeof financeDomain.listInvoices>>[number]
