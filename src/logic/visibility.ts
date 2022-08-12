const tasks = new Map()

export const addVisibilityTask = (key: string, task: (isHidden: boolean) => void) => {
  tasks.set(key, task)
}

export const removeVisibilityTask = (key: string) => {
  tasks.delete(key)
}

document.addEventListener('visibilitychange', () => {
  for (const task of tasks.values()) {
    task(document.hidden)
  }
})
