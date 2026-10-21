import { redirect } from 'next/navigation'

export default function AdminHoneypotRoot() {
  redirect('/admin/login')
}
