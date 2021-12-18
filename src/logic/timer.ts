let timer = null as any
const tasks = {}

export const addTimerTask = (key: string, task: () => void) => {
  tasks[key] = task
}

export const removeTimerTask = (key: string) => {
  delete tasks[key]
}

export const startTimer = () => {
  timer = setInterval(() => {
    for (const key of Object.keys(tasks)) {
      tasks[key]()
    }
  }, 1000)
}

export const stopTimer = () => {
  clearInterval(timer)
}
