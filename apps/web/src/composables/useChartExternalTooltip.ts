// composables/useChartExternalTooltip.ts
import { ref } from 'vue'
import type { Chart, TooltipModel } from 'chart.js'

export interface TooltipPosition {
    visible: boolean
    pinned: boolean
    x: number
    y: number
    dataIndex: number | null
    datasetIndex: number | null
}

const HIDE_DELAY = 100 // ms — margen para que el ratón "salte" del canvas al tooltip sin parpadeo

export function useChartExternalTooltip() {
    const tooltip = ref<TooltipPosition>({
        visible: false,
        pinned: false,
        x: 0,
        y: 0,
        dataIndex: null,
        datasetIndex: null
    })

    const hoveringTooltip = ref(false)
    let hideTimer: ReturnType<typeof setTimeout> | null = null

    const clearHideTimer = () => {
        if (hideTimer) {
            clearTimeout(hideTimer)
            hideTimer = null
        }
    }

    const scheduleHide = () => {
        clearHideTimer()
        hideTimer = setTimeout(() => {
            if (!tooltip.value.pinned && !hoveringTooltip.value) {
                tooltip.value.visible = false
            }
        }, HIDE_DELAY)
    }

    const externalTooltipHandler = (context: { chart: Chart; tooltip: TooltipModel<any> }) => {
        if (tooltip.value.pinned) return

        const { tooltip: tooltipModel } = context

        if (tooltipModel.opacity === 0) {
            scheduleHide()
            return
        }

        // Hay un punto activo: cancelamos cualquier ocultado pendiente y actualizamos ya
        clearHideTimer()

        const dataPoint = tooltipModel.dataPoints?.[0]
        if (!dataPoint) return

        tooltip.value.visible = true
        tooltip.value.x = tooltipModel.caretX
        tooltip.value.y = tooltipModel.caretY
        tooltip.value.dataIndex = dataPoint.dataIndex
        tooltip.value.datasetIndex = dataPoint.datasetIndex
    }

    const setHoveringTooltip = (value: boolean) => {
        hoveringTooltip.value = value
        if (value) {
            clearHideTimer() // el ratón entró en el tooltip: cancelamos el ocultado
        } else if (!tooltip.value.pinned) {
            scheduleHide() // el ratón salió del tooltip: programamos ocultado (por si no vuelve al canvas)
        }
    }

    const pinTooltip = (dataIndex: number, datasetIndex: number, x: number, y: number) => {
        clearHideTimer()
        tooltip.value = { visible: true, pinned: true, x, y, dataIndex, datasetIndex }
    }

    const closeTooltip = () => {
        clearHideTimer()
        tooltip.value = { visible: false, pinned: false, x: 0, y: 0, dataIndex: null, datasetIndex: null }
    }

    return { tooltip, externalTooltipHandler, setHoveringTooltip, pinTooltip, closeTooltip }
}