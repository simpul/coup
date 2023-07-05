import { defineConfig } from 'vite';
import { ViteCodeInspectorPlugin } from 'vite-code-inspector-plugin';
import vue from '@vitejs/plugin-vue';
import Components from 'unplugin-vue-components/vite';
import { AntDesignVueResolver } from 'unplugin-vue-components/resolvers';
import eslintPlugin from 'vite-plugin-eslint';

export default defineConfig({
    plugins: [
        vue(),
        eslintPlugin({
            include: ['src/**/*.vue', 'src/**/*.js', 'src/*.vue', 'src/*.js'],
        }),
        Components({
            resolvers: [AntDesignVueResolver()],
        }),
        ViteCodeInspectorPlugin(),
    ],
    server: {
        proxy: {
            '/api': {
                target: 'http://localhost:3000',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api/, ''),
            },
            '/socket.io': {
                target: 'ws://localhost:3000',
                ws: true,
            },
        }
    }
});
