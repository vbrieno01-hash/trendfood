Remover o selo "Temporariamente fechada" do card no marquee da landing.

**`src/components/landing/TopStoresMarquee.tsx`:**
- Remover o `<span>` do selo.
- Voltar o nome pra `<span>` simples (sem wrapper `flex flex-col`).
- Manter `opacity-60 grayscale` na logo das pausadas.
- Manter tooltip `title` informativo.