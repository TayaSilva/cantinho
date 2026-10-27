import { navigate } from '../../hooks/useRoute';
import { AdminIcon, Button } from '../admin/controls';

export function SettingsPage({ email }: { email?: string }) {
  return (
    <main className="min-h-dvh bg-stone-50 font-admin text-sm text-stone-900">
      <header className="flex items-center gap-3 border-b border-stone-200 bg-white px-4 py-3 sm:px-6">
        <Button variant="ghost" onClick={() => navigate('/meus-cantinhos')} aria-label="Voltar">
          <AdminIcon name="chevron" className="size-4 rotate-90" />
          Voltar
        </Button>
        <h1 className="text-base font-bold">Configurações</h1>
      </header>
      <section className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-8 sm:px-6">
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Sua conta</h2>
          <p className="mt-1 text-stone-600">{email || 'Conta local de desenvolvimento'}</p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Privacidade</h2>
          <p className="mt-1 leading-relaxed text-stone-600">
            Seu cantinho e seus arquivos são privados por padrão. O acesso é protegido pela sua conta e o compartilhamento público permanece desativado.
          </p>
        </div>
      </section>
    </main>
  );
}
