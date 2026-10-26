# Personagens

Os personagens são montados em código (`components/house/Character.tsx`) a partir
das opções do catálogo (`data/catalog.ts`): tom de pele, estilo e cor do cabelo,
roupa e cor, acessório e expressão — 5 opções cada, todas desenhadas para a mesma
pose sentada. O administrador escolhe no editor visual (`/admin/editor`).

Para acrescentar uma opção: inclua uma entrada no catálogo com `elementType`
correspondente e trate o novo valor em `Character.tsx`.
