import Image from 'next/image'
import Orbit from '@/components/Orbit'
import Uploader from '@/components/Uploader'
import { logout } from './actions'

export default function Home() {
  return (
    <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-10 px-5 pb-24 pt-8 sm:px-8 sm:pt-10">
      <header className="flex items-start justify-between">
        <h1 className="font-display text-xl font-light tracking-tight sm:text-2xl">Halo, Dev Alyz.</h1>
        <form action={logout}>
          <button className="text-sm text-ash/50 transition hover:text-heat">Logout</button>
        </form>
      </header>

      <section className="card flex items-center gap-5 p-5 sm:gap-8 sm:p-7">
        <div className="avatar-ring h-20 w-20 shrink-0 rounded-full p-[3px] sm:h-28 sm:w-28">
          <Image src="/avatar.jpg" alt="" width={112} height={112} priority className="h-full w-full rounded-full object-cover" />
        </div>
        <p className="font-display text-3xl font-bold tracking-tight sm:text-6xl">ALYZ DEV</p>
      </section>

      <section className="space-y-5">
        <h2 className="font-display text-lg font-medium tracking-tight sm:text-xl">ALYz Project</h2>
        <Orbit />
      </section>

      <Uploader />
    </main>
  )
}
