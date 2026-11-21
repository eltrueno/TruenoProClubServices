/**
 * Quién hace la web y dónde está el código: el footer, el bloque "Hecho por" de la portada y el
 * botón de estrella de GitHub salen de aquí.
 */
export const DEVELOPER = {
    name: "Raúl Jiménez",
    handle: "el_trueno",
    githubUser: "eltrueno",
    github: "https://github.com/eltrueno",
    /** Foto de perfil de GitHub (la sirve GitHub; ?size para no bajar la grande) */
    avatar: "https://github.com/eltrueno.png?size=160",
    socials: [
        { id: "github", label: "GitHub", href: "https://github.com/eltrueno" },
        { id: "x", label: "X / Twitter", href: "https://x.com/elh_trueno" },
        { id: "instagram", label: "Instagram", href: "https://www.instagram.com/rauljimenezgal/" },
    ],
} as const

/** El repositorio (público) de todo el proyecto: webs, api, bot, estadísticas… */
export const REPO = {
    owner: "eltrueno",
    name: "TruenoProClubServices",
    url: "https://github.com/eltrueno/TruenoProClubServices",
    forkUrl: "https://github.com/eltrueno/TruenoProClubServices/fork",
    /** API pública de GitHub (sin token: 60 peticiones/hora por IP, por eso se cachea en el navegador) */
    api: "https://api.github.com/repos/eltrueno/TruenoProClubServices",
} as const
