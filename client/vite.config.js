import { defineConfig } from 'vite';
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
	],
});
