import { Chart } from "chart.js"

/**
 * Las gráficas se pintan en canvas y no heredan la fuente de la página: Chart.js usa la suya
 * (Helvetica/Arial) o, si se le pide una que no está cargada, la del navegador. Se le pasa la
 * misma que el body para que rótulos y ejes casen con el resto de la web.
 */
export function useSiteFontInCharts() {
    if (typeof document === "undefined") return
    Chart.defaults.font.family = getComputedStyle(document.body).fontFamily
}
