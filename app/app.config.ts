// Identidade visual do ENSPACE: as mesmas cores do portal de documentação
// (en-docs, app/app.config.ts) e dos protótipos. A paleta `space` fica em
// app/assets/css/main.css. A fonte do ENSPACE (Acumin Pro Wide) é licenciada,
// então o painel segue com Public Sans.
export default defineAppConfig({
  ui: {
    colors: {
      primary: 'fuchsia',
      secondary: 'cyan',
      success: 'teal',
      info: 'cyan',
      warning: 'yellow',
      error: 'red',
      neutral: 'space'
    }
  }
})
