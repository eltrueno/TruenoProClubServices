/**
 * Cola de una en una para lo que toca las stats: la sincronización de partidos (que suma stats
 * al insertar) y el recálculo completo (que las borra y las rehace) no pueden pisarse, o un
 * partido se contaría dos veces o ninguna.
 *
 * Cada tarea lleva un nombre ("sync", "recalculate"…) para que el panel sepa qué está haciendo el
 * worker y cuántas esperan (`exclusiveState`, lo devuelve el ping del RPC).
 */
let queue: Promise<unknown> = Promise.resolve()
let running: { label: string; since: Date } | null = null
let waiting = 0

export function runExclusive<T>(task: () => Promise<T>, label = "task"): Promise<T> {
    waiting++
    const wrapped = async () => {
        waiting--
        running = { label, since: new Date() }
        try {
            return await task()
        } finally {
            running = null
        }
    }
    const run = queue.then(wrapped, wrapped)
    // La cola sigue aunque una tarea falle; el error lo recibe quien la llamó
    queue = run.catch(() => undefined)
    return run
}

/** Lo que corre ahora y cuántas tareas esperan detrás */
export function exclusiveState(): { running: string | null; runningSince: string | null; waiting: number } {
    return { running: running?.label ?? null, runningSince: running?.since.toISOString() ?? null, waiting }
}
