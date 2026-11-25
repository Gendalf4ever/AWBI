import { useState } from "react";
import { loginRequest } from "./api/client";
import OperatorShift from '.pages/OperatorShift'
import MasterDashboard from './pages/MasterDashboard'

export default function App() {
    const [auth, setAuth] = useState(() => {
        const token = localStorage.getItem('token')
        const role = localStorage.getItem('role')
        const username = localStorage.getItem('username')
        return token ? {token, role, username} : null
    })

    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleLogin = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)
        try{
            const data = await loginRequest(username.trim(), password)
            localStorage.setItem('token', data.access_token)
            localStorage.setItem('role', data.role)
            localStorage.setItem('username', username.trim())
            setAuth({token: data.access_token, role: data.role, username: username.trim() })
        } catch (err) {
            setError(err.response?.data?.detail || 'Ошибка входа')
        } finally {
            setLoading(false)
        }
    }


    const handleLogout = () => {
        localStorage.clear()
        setAuth(null)
        setUsername('')
        setPassword('')
    }

    if(!auth) {
        return(
            <div className="min-h-screen flex items-center justify-center p-4">
                <form
                onSubmit={handleLogin}
                className="w-full max-2-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4"
                >
                    <div className="textCenter">
                        <h1 className="text-2xl font-bold text-indigo-400">VR Club BI</h1>
                        <p className="text-sm text-slate-400 mt-1">Вход в рабочую систему</p>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/40 text-red-300 text-sm rounded-lg p-3">
                            {error}
                         </div>
                    )}

                    <div>
                        <label className="block text-xs text-slate-400 mb-1">Логин</label>
                        <input
                        type="text"
                        required
                        autoFocus
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Administrator / Master"
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                        ></input>
                    </div>

                    <div>
                        <label className="block text-xs text-slate-400 mb-1">Пароль</label>
                        <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="..."
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                        ></input>
                    </div>
                    <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 font-medium rounded-lg py-2.5 text-sm transition"
                    >
                        {loading ? 'Выполняется вход...' : 'Войти'}
                    </button>
                </form>
            </div>            
        )
    }

    return auth.role === 'master' ? (
        <MasterDashboard onLogout={handleLogout} username={auth.username}></MasterDashboard>
    ) : (
        <OperatorShift onLogout={handleLogout} username={auth.username}></OperatorShift>
    )
}