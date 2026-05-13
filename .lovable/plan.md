## Plano: publicar e concluir verificação no Search Console

A meta tag `google-site-verification` já está no `index.html`, mas só vai pra `https://trendfood.site` depois que você publicar a nova versão. Eu não consigo clicar em "Publish" por você — esse passo é manual.

### Passos

1. **Você publica o site**
   - Clique em **Publish** (canto superior direito) → **Update**.
   - Aguarde alguns segundos até o deploy terminar.
   - Me avise "publicado" no chat.

2. **Eu confirmo que a meta tag está no ar**
   - Faço `curl https://trendfood.site` e procuro pela tag `google-site-verification`.
   - Se não estiver, peço pra você dar refresh e tentar de novo.

3. **Eu disparo a verificação no Google**
   - Chamo o endpoint `siteVerification/v1/webResource?verificationMethod=META` via connector.
   - Resposta 200 = verificado. Erro `failedToFindMetaTag` = deploy ainda não propagou; tento de novo.

4. **Eu adiciono o site no Search Console**
   - `PUT /webmasters/v3/sites/https%3A%2F%2Ftrendfood.site%2F`.
   - A propriedade aparece na sua conta do Search Console.

5. **Eu submeto o sitemap**
   - `PUT /webmasters/v3/sites/.../sitemaps/https%3A%2F%2Ftrendfood.site%2Fsitemap.xml`.
   - Confirmo o status retornado pelo Google.

### O que você precisa fazer agora

Apenas: **clicar em Publish → Update** e me avisar quando terminar. O resto eu faço.