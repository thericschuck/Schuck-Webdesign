import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { EditClientForm } from './EditClientForm'
import Link from 'next/link'
import { clientDisplayName } from '@/lib/client-name'

export default async function EditClientPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: client } = await supabase
    .from('clients')
    .select(`
      id, company_name, website, phone, status,
      address_street, address_city, address_zip, address_country,
      notes,
      profile:profiles(full_name, email)
    `)
    .eq('id', id)
    .single()

  if (!client) notFound()

  const profile = Array.isArray(client.profile) ? client.profile[0] : client.profile

  return (
    <div className="max-w-2xl">
      <nav className="flex items-center gap-2 text-sm text-gray-400 mb-6" style={{ fontFamily: 'var(--font-dm-sans)' }}>
        <Link href="/admin/clients" className="hover:text-gray-600 transition-colors">Kunden</Link>
        <span>/</span>
        <Link href={`/admin/clients/${client.id}`} className="hover:text-gray-600 transition-colors">
          {clientDisplayName(profile?.full_name, client.company_name)}
        </Link>
        <span>/</span>
        <span className="text-gray-700">Bearbeiten</span>
      </nav>

      <h1 className="text-2xl font-bold text-gray-900 mb-6" style={{ fontFamily: 'var(--font-playfair)' }}>
        Kunde bearbeiten
      </h1>

      <EditClientForm
        clientId={id}
        defaultValues={{
          company_name:    client.company_name ?? '',
          full_name:       profile?.full_name ?? '',
          phone:           client.phone ?? '',
          website:         client.website ?? '',
          status:          client.status,
          address_street:  client.address_street ?? '',
          address_city:    client.address_city ?? '',
          address_zip:     client.address_zip ?? '',
          address_country: client.address_country ?? 'Deutschland',
          notes:           client.notes ?? '',
        }}
      />
    </div>
  )
}
