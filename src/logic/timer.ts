let timer: NodeJS.Timeout
const tasks = new Map()

export const addTimerTask = (key: string, task: () => void) => {
  task()
  tasks.set(key, task)
}

export const removeTimerTask = (key: string) => {
  tasks.delete(key)
}

export const startTimer = () => {
  timer = setInterval(() => {
    for (const task of tasks.values()) {
      task()
    }
  }, 1000)
}

export const stopTimer = () => {
  clearInterval(timer)
}
