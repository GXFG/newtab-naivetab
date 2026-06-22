import axios, { AxiosResponse, AxiosError } from 'axios'

const config = {
  timeout: 15000,
  headers: {},
  // withCredentials: true, // 跨域请求携带Cookie
}

const instance = axios.create(config)

instance.interceptors.request.use(
  (config) => {
    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

const responseHandler = (response: AxiosResponse) => {
  return response.data
}

const responseErrorHandler = (error: AxiosError) => {
  const msg = `${error.message}: ${error.config?.url}`
  console.warn(msg)
  // 网络错误提示由调用方决定是否使用 showToast 展示给用户
  return Promise.reject(error)
}

instance.interceptors.response.use(responseHandler, responseErrorHandler)

export default instance
