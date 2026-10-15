import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: './src/index.ts',
      formats: ['es', 'cjs'],
      fileName: (format) => (format === 'cjs' ? 'index.cjs' : 'index.js'),
      cssFileName: 'style'
    },
    rollupOptions: {
      // Keep both React's runtime and JSX runtimes external. Bundling the JSX
      // runtime duplicates React internals and breaks React 19 consumers.
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
        '@xyflow/react'
      ],
      output: { globals: { react: 'React', 'react-dom': 'ReactDOM', '@xyflow/react': 'XYFlow' } }
    }
  }
});
