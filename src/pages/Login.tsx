import { useState, type FormEvent } from 'react'
import { LoaderCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [modo, setModo] = useState<'entrar' | 'criar'>('entrar')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setErro('')
    setAviso('')
    setEnviando(true)
    if (modo === 'entrar') {
      const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
      if (error) setErro(error.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : error.message)
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password: senha, options: { emailRedirectTo: window.location.origin } })
      if (error) setErro(error.message)
      else if (!data.session) setAviso('Enviamos um link de confirmação para o seu e-mail. Confirme e depois entre aqui.')
    }
    setEnviando(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-xl font-bold text-on-brand">F</span>
          <div>
            <h1 className="text-xl font-bold text-fg">Finanças da Família</h1>
            <p className="text-sm text-muted">{modo === 'entrar' ? 'Entre para ver as finanças da família' : 'Crie seu acesso (o e-mail precisa estar autorizado)'}</p>
          </div>
        </div>

        <form onSubmit={enviar} className="space-y-3 rounded-3xl border border-line bg-surface p-5">
          <div>
            <label className="rotulo" htmlFor="email">E-mail</label>
            <input id="email" type="email" required autoComplete="email" className="campo" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="rotulo" htmlFor="senha">Senha</label>
            <input
              id="senha" type="password" required minLength={8}
              autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'}
              className="campo" value={senha} onChange={e => setSenha(e.target.value)}
            />
          </div>
          {erro && <p className="text-xs text-negativo">{erro}</p>}
          {aviso && <p className="text-xs text-positivo">{aviso}</p>}
          <button
            type="submit" disabled={enviando}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-2.5 text-sm font-semibold text-on-brand hover:bg-brand-strong disabled:opacity-60"
          >
            {enviando && <LoaderCircle size={16} className="animate-spin" />}
            {modo === 'entrar' ? 'Entrar' : 'Criar acesso'}
          </button>
        </form>

        <p className="text-center text-sm text-muted">
          {modo === 'entrar' ? 'Primeiro acesso? ' : 'Já tem acesso? '}
          <button className="font-medium text-brand hover:underline" onClick={() => { setModo(modo === 'entrar' ? 'criar' : 'entrar'); setErro(''); setAviso('') }}>
            {modo === 'entrar' ? 'Criar acesso' : 'Entrar'}
          </button>
        </p>
      </div>
    </div>
  )
}
