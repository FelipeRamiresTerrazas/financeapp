-- Sincronização automática com a Pluggy: 7h e 19h (horário de Brasília = UTC-3).
-- O Meu Pluggy atualiza os dados dos bancos a cada 24h; duas leituras por dia garantem que
-- o app pegue a atualização logo depois que ela acontece.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- segredo aleatório que a Edge Function confere (check_cron_secret); nunca sai do banco
select vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'cron_secret', 'Autoriza o pg_cron a chamar a pluggy-sync');
select vault.create_secret('https://grnpqvqqwqlvztznbukh.supabase.co', 'project_url', 'URL do projeto, usada pelo pg_cron');

select cron.schedule(
  'pluggy-sync',
  '0 10,22 * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/pluggy-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 150000
  )
  $$
);
