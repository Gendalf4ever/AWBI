import { difineConfig} from 'vite'
import react from '@vitejs/plugin-react'

export default difineConfig({
    plugins: [react()],
    server: {
        port: 5173,
        proxy: {
            '/api': {
                target: 'http://127.0.0.1:8000',
                changeOrigin: true,
            },
        },
    },
})