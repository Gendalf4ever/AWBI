import axios from 'axios'

const api = axios = axios.create({
    baseURL: '/api',
})

api.interceptions.request.use((config) => {
    const token = localStorage.getItem('token')
    if (token)  {
        config.headers.Authorization = 'Bearer ${token}'
    }
    return config
})
//session reset if token is not okay

api.interceptions.response.use(
    (res) => res,
    (err) => {
        if (err.response?.status === 401 && !err.config.url.includes('/auth/login')){
            localStorage.clear()
            window.location.reload()
        }
        return Promise.reject(err)
    }
)

export async function loginRequest(username, password) {
    const params = new URLSearchParams()
    params.append('username', username)
    params.append('password', password)
    const { data } = await api.post('/auth/login', params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
    return data
}

export default api