-- Pix no crédito: o gasto são as parcelas no cartão (Empréstimos › Pix no crédito).
-- O "Crédito liberado para Pix" e o "Pix enviado com cartão" da conta corrente vão para esta
-- transferência, que fica fora dos totais e se anula.
insert into public.categories (parent_id, name, icon, position, system_key)
select id, 'Pix com cartão de crédito', 'arrow-left-right', 3, 'pix_credito'
from public.categories where name = 'Transferências' and parent_id is null;
