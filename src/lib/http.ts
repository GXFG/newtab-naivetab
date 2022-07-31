import axios, { AxiosResponse, AxiosError } from 'axios'

const config = {
  timeout: 8000,
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
  window.$message.error(`${error.message}: ${error.config.url}`)
  return Promise.reject(error)
}

instance.interceptors.response.use(responseHandler, responseErrorHandler)

export default instance
