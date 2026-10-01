-- Categorias iniciais (editáveis no app). As com system_key são usadas pelo sincronizador.
do $$
declare
  arvore jsonb := $json$[
    {"nome": "Moradia", "icone": "home", "subs": ["Aluguel e financiamento", "Condomínio", "Energia", "Água", "Gás", "Internet, TV e telefone", "Manutenção e reforma", "Casa e decoração"]},
    {"nome": "Alimentação", "icone": "utensils", "subs": ["Mercado", "Restaurantes", "Delivery", "Padaria e café", "Bares"]},
    {"nome": "Transporte", "icone": "car", "subs": ["Combustível", "App de transporte", "Estacionamento e pedágio", "Transporte público", "Manutenção do carro", "IPVA, seguro e licenciamento"]},
    {"nome": "Saúde", "icone": "heart-pulse", "subs": ["Farmácia", "Plano de saúde", "Médicos e exames", "Dentista", "Academia e esportes"]},
    {"nome": "Educação", "icone": "graduation-cap", "subs": ["Escola", "Cursos e idiomas", "Material escolar", "Livros"]},
    {"nome": "Compras", "icone": "shopping-bag", "subs": ["Roupas e calçados", "Eletrônicos", "Compras online", "Presentes", "Utilidades"]},
    {"nome": "Lazer e viagens", "icone": "plane", "subs": ["Viagens e hospedagem", "Passagens", "Cinema e eventos", "Jogos", "Hobbies"]},
    {"nome": "Assinaturas e serviços", "icone": "repeat", "subs": ["Streaming", "Apps e software", "Serviços profissionais", "Beleza e cuidados"]},
    {"nome": "Pets", "icone": "paw-print", "subs": ["Pet shop", "Veterinário"]},
    {"nome": "Impostos e taxas", "icone": "receipt", "subs": ["Tarifas bancárias", "Juros e IOF", "Anuidade", "Impostos"]},
    {"nome": "Empréstimos e financiamentos", "icone": "landmark", "subs": ["Pix no crédito", "Empréstimos", "Financiamento imobiliário", "Parcelamento de fatura"]},
    {"nome": "Outros", "icone": "circle-dashed", "subs": ["Pix e transferências", "Saques", "Doações", "Diversos"]},
    {"nome": "Receitas", "icone": "trending-up", "tipo": "receita", "subs": ["Salário", "Pró-labore e empresa", "Rendimentos", "Reembolsos e estornos", "Pix recebido", "Outras receitas"]},
    {"nome": "Transferências", "icone": "arrow-left-right", "tipo": "transferencia", "subs": ["Pagamento de fatura", "Entre contas próprias", "Aplicações e resgates"]}
  ]$json$;
  chaves jsonb := $json${
    "Transferências/Pagamento de fatura": "pagamento_fatura",
    "Transferências/Entre contas próprias": "transferencia_propria",
    "Transferências/Aplicações e resgates": "investimentos",
    "Outros/Diversos": "outros",
    "Outros/Pix e transferências": "pix_enviado",
    "Receitas/Outras receitas": "outras_receitas",
    "Receitas/Pix recebido": "pix_recebido",
    "Receitas/Reembolsos e estornos": "estornos"
  }$json$;
  cat jsonb;
  sub text;
  mae_id uuid;
  pos int := 0;
  pos_sub int;
begin
  for cat in select * from jsonb_array_elements(arvore) loop
    insert into public.categories (name, icon, kind, position)
    values (cat->>'nome', cat->>'icone', coalesce(cat->>'tipo', 'despesa'), pos)
    returning id into mae_id;
    pos := pos + 1;
    pos_sub := 0;
    for sub in select * from jsonb_array_elements_text(cat->'subs') loop
      insert into public.categories (parent_id, name, icon, position, system_key)
      values (mae_id, sub, cat->>'icone', pos_sub, chaves->>((cat->>'nome') || '/' || sub));
      pos_sub := pos_sub + 1;
    end loop;
  end loop;
end $$;

insert into public.people (name) values ('Felipe'), ('Day');
