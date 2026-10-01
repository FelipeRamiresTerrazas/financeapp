-- As funções de gatilho que vinculam membros não devem ser chamáveis pela API (/rest/v1/rpc).
-- Os gatilhos continuam funcionando: a permissão de execução não é checada ao disparar.
revoke execute on function public.sync_member_from_email() from public, anon, authenticated;
revoke execute on function public.sync_member_from_allowlist() from public, anon, authenticated;
