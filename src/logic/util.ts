const logStyles = [
  'padding: 3px 8px',
  'background: #1475B2',
  'color: #fff',
  'border-radius: 3px',
].join(';')

export const log = (msg: string, ...args: any[]) => {
  console.log(`%c${msg}`, logStyles, ...args)
}

export const sleep = (time: number) => {
  return new Promise((resolve) => {
    setTimeout(() => { resolve(null) }, time)
  })
}
