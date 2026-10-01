-- Listar conexões (GET /v2/items) é recurso opt-in da Pluggy, desligado por padrão.
-- Então o usuário cadastra o Item ID da conexão MeuPluggy no app, e a sincronização
-- busca cada conexão cadastrada (GET /items/{id}).
create policy "membros: cadastrar conexão" on public.pluggy_items for insert to authenticated with check ((select public.is_member()));
create policy "membros: remover conexão" on public.pluggy_items for delete to authenticated using ((select public.is_member()));
