/**
 * Cola de una en una para lo que toca las stats: la sincronización de partidos (que suma stats
 * al insertar) y el recálculo completo (que las borra y las rehace) no pueden pisarse, o un
 * partido se contaría dos veces o ninguna.
 */
let queue: Promise<unknown> = Promise.resolve()

export function runExclusive<T>(task: () => Promise<T>): Promise<T> {
    const run = queue.then(task, task)
    // La cola sigue aunque una tarea falle; el error lo recibe quien la llamó
    queue = run.catch(() => undefined)
    return run
}
